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

  return false;
});

async function getSessionContext(targetUrl) {
  if (!targetUrl) {
    throw new Error('Target Salesforce URL is required.');
  }

  const normalizedUrl = new URL(targetUrl).origin;
  const sidCookie = await chrome.cookies.get({
    url: normalizedUrl,
    name: 'sid'
  });

  return {
    instanceUrl: normalizedUrl,
    sessionId: sidCookie?.value || null
  };
}