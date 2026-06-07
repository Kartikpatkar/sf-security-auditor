const DEFAULT_SETTINGS = {
  apiVersion: '60.0',
  theme: 'system'
};

const APP_PAGE_PATH = 'src/app/app.html';

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get('settings');

  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const launchContext = {
    sourceTabId: tab?.id || null,
    sourceUrl: tab?.url || null,
    openedAt: Date.now()
  };

  await chrome.storage.local.set({ launchContext });

  const appUrl = chrome.runtime.getURL(APP_PAGE_PATH);
  const existingTabs = await chrome.tabs.query({ url: appUrl });

  if (existingTabs[0]?.id) {
    await chrome.tabs.update(existingTabs[0].id, { active: true });

    if (typeof existingTabs[0].windowId === 'number') {
      await chrome.windows.update(existingTabs[0].windowId, { focused: true });
    }

    return;
  }

  await chrome.tabs.create({ url: appUrl });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'sfsa:getSettings') {
    chrome.storage.local.get('settings').then(({ settings }) => {
      sendResponse({ ok: true, data: settings || DEFAULT_SETTINGS });
    });
    return true;
  }

  if (message?.type === 'sfsa:updateSettings') {
    const nextSettings = {
      ...DEFAULT_SETTINGS,
      ...(message.payload || {})
    };

    chrome.storage.local.set({ settings: nextSettings }).then(() => {
      sendResponse({ ok: true, data: nextSettings });
    });
    return true;
  }

  if (message?.type === 'sfsa:getLaunchContext') {
    chrome.storage.local.get('launchContext').then(({ launchContext }) => {
      sendResponse({ ok: true, data: launchContext || null });
    });
    return true;
  }

  if (message?.type === 'sfsa:setLaunchContext') {
    chrome.storage.local.set({ launchContext: message.payload || null }).then(() => {
      sendResponse({ ok: true, data: message.payload || null });
    });
    return true;
  }

  if (message?.type === 'sfsa:getSessionContext') {
    getSessionContext(message.payload?.url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'sfsa:proxyFetch') {
    proxyFetch(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function proxyFetch(payload) {
  const { url, method, headers, body } = payload;

  const response = await fetch(url, {
    method,
    headers,
    body: body || undefined
  });

  const responseText = await response.text();

  // Convert Headers object to a plain object
  const responseHeaders = {};
  for (const [key, val] of response.headers.entries()) {
    responseHeaders[key] = val;
  }

  return {
    bodyText: responseText,
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  };
}

async function getSessionContext(targetUrl) {
  if (!targetUrl) {
    throw new Error('Target Salesforce URL is required.');
  }

  const url = new URL(targetUrl);
  const hostname = url.hostname;
  
  // Convert lightning/visualforce hostnames to my.salesforce.com for API calls
  let apiHostname = hostname;
  if (hostname.includes('.lightning.force.com')) {
    apiHostname = hostname.replace('.lightning.force.com', '.my.salesforce.com');
  } else if (hostname.includes('.visual.force.com')) {
    apiHostname = hostname.replace('.visual.force.com', '.my.salesforce.com');
  } else if (hostname.includes('.visualforce.com')) {
    apiHostname = hostname.replace('.visualforce.com', '.my.salesforce.com');
  }
  
  const apiUrl = `${url.protocol}//${apiHostname}`;

  // Strategy 1: Attempt to retrieve 'sid' cookie directly for the API URL (my.salesforce.com)
  let sidCookie = await chrome.cookies.get({
    url: apiUrl,
    name: 'sid'
  });

  // Strategy 2: If not found, attempt to retrieve 'sid' cookie for the current tab's origin
  if (!sidCookie) {
    sidCookie = await chrome.cookies.get({
      url: url.origin,
      name: 'sid'
    });
  }

  // Strategy 3: Fall back to searching all 'sid' cookies matching the subdomain of the active tab
  if (!sidCookie) {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'login' && subdomain !== 'test') {
      const allSids = await chrome.cookies.getAll({ name: 'sid' });
      // Find a cookie that belongs to the same org subdomain on any salesforce domain
      sidCookie = allSids.find(c => {
        const domain = c.domain.toLowerCase();
        return (domain.includes(subdomain.toLowerCase()) && 
                (domain.includes('salesforce.com') || domain.includes('force.com')));
      });
    }
  }

  // If a cookie is found, we should use its domain to construct the proper instanceUrl for API calls
  let finalInstanceUrl = apiUrl;
  if (sidCookie) {
    const cookieHost = sidCookie.domain.startsWith('.') ? sidCookie.domain.slice(1) : sidCookie.domain;
    const subdomain = hostname.split('.')[0];
    if (cookieHost.includes('salesforce.com') && !cookieHost.includes('lightning.force.com') && cookieHost.includes(subdomain)) {
      finalInstanceUrl = `${url.protocol}//${cookieHost}`;
    }
  }

  console.log('[Session Context] Resolved session context:', {
    targetUrl,
    resolvedInstanceUrl: finalInstanceUrl,
    cookieFound: !!sidCookie,
    cookieDomain: sidCookie?.domain || null
  });

  return {
    instanceUrl: finalInstanceUrl,
    sessionId: sidCookie?.value || null
  };
}