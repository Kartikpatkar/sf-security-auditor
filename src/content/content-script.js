(function initializeContentRuntime() {
  const PAGE_CONTEXT_EVENT = 'sfsa:page-context';
  const PROFILE_METADATA_CACHE_TTL_MS = 5 * 60 * 1000;
  const METADATA_INVENTORY_CACHE_TTL_MS = 5 * 60 * 1000;
  let latestPageContext = null;
  const metadataCache = {
    profileMetadata: new Map(),
    inventory: new Map()
  };

  injectPageBridge();
  document.addEventListener(PAGE_CONTEXT_EVENT, handlePageContext);

  // Intercept global fetch in this content script environment to route through the background page
  // This completely bypasses page-level CORS and CSP blocks in Chrome extensions
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('salesforce.com') || url.includes('force.com') || url.startsWith('/services/')) {
      try {
        const method = init?.method || 'GET';
        
        // Serialize headers
        const headers = {};
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            for (const [key, val] of init.headers.entries()) {
              headers[key] = val;
            }
          } else if (Array.isArray(init.headers)) {
            for (const [key, val] of init.headers) {
              headers[key] = val;
            }
          } else {
            Object.assign(headers, init.headers);
          }
        }

        // Serialize body
        let body = undefined;
        if (init?.body) {
          body = init.body;
        }

        const response = await chrome.runtime.sendMessage({
          type: 'sfsa:proxyFetch',
          payload: {
            url: url.startsWith('/') ? `${window.location.origin}${url}` : url,
            method,
            headers,
            body
          }
        });

        if (!response?.ok) {
          throw new Error(response?.error || 'Proxy fetch failed.');
        }

        return new Response(response.data.bodyText, {
          status: response.data.status,
          statusText: response.data.statusText,
          headers: new Headers(response.data.headers)
        });
      } catch (error) {
        console.error('[SFSA Proxy Fetch] Failed:', error);
        throw error;
      }
    }

    return originalFetch.apply(this, arguments);
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'sfsa:getOrgContext') {
      resolveOrgContext()
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === 'sfsa:runOverviewAudit') {
      runOverviewAudit(message.payload || {})
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === 'sfsa:runProfileInventoryAudit') {
      runProfileInventoryAudit(message.payload || {})
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === 'sfsa:runSystemPermissionsAudit') {
      runSystemPermissionsAudit(message.payload || {})
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === 'sfsa:runObjectAccessAudit') {
      runObjectAccessAudit(message.payload || {})
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === 'sfsa:runMetadataInventoryAudit') {
      runMetadataInventoryAudit(message.payload || {})
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    return false;
  });

  function injectPageBridge() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/content/page-bridge.js');
    script.type = 'module';
    script.async = false;
    script.dataset.sfsa = 'page-bridge';
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  function handlePageContext(event) {
    latestPageContext = event.detail;
  }

  async function resolveOrgContext() {
    const discoveredContext = latestPageContext || fallbackOrgContext();
    const sessionContext = await resolveSessionContext(discoveredContext.orgUrl);
    const apiVersion = await resolveApiVersion(discoveredContext.apiVersion, sessionContext);

    return {
      ...discoveredContext,
      apiVersion,
      sessionId: sessionContext.sessionId,
      instanceUrl: sessionContext.instanceUrl || discoveredContext.orgUrl,
      url: window.location.href,
      isSalesforce: true
    };
  }

  function fallbackOrgContext() {
    const hostname = window.location.hostname;
    const standardMatch = hostname.match(/^([a-z]{2}\d+)\./i);
    const instance = standardMatch ? standardMatch[1].toUpperCase() : hostname.split('.')[0];

    return {
      orgUrl: window.location.origin,
      hostname,
      instance,
      orgId: document.querySelector('meta[name="salesforce-org-id"]')?.content || null,
      apiVersion: '60.0',
      uiType: window.location.href.includes('/lightning/') ? 'lightning' : 'classic',
      pageTitle: document.title,
      connectionMode: 'cookie-session'
    };
  }

  async function resolveSessionContext(orgUrl) {
    const response = await chrome.runtime.sendMessage({
      type: 'sfsa:getSessionContext',
      payload: { url: orgUrl || window.location.origin }
    });

    if (!response?.ok) {
      return {
        instanceUrl: orgUrl || window.location.origin,
        sessionId: null
      };
    }

    return response.data;
  }

  async function resolveApiVersion(preferredVersion, sessionContext = {}) {
    try {
      const versions = await fetchJson('/services/data/', {
        instanceUrl: sessionContext.instanceUrl,
        sessionId: sessionContext.sessionId
      });

      if (!Array.isArray(versions) || versions.length === 0) {
        return preferredVersion || '60.0';
      }

      const normalized = preferredVersion?.startsWith('v') ? preferredVersion : `v${preferredVersion}`;
      const exactMatch = versions.find((item) => item.version === normalized);

      return (exactMatch || versions[versions.length - 1]).version.replace(/^v/, '');
    } catch {
      return preferredVersion || '60.0';
    }
  }

  async function runOverviewAudit(payload) {
    const orgContext = payload.orgContext || await resolveOrgContext();
    const apiVersion = orgContext.apiVersion;
    const basePath = `/services/data/v${apiVersion}`;
    const requestOptions = buildRestRequestOptions(orgContext);

    const [organization, activeUsers, profiles, permissionSets, activeGuestUsers] = await Promise.all([
      queryOne(basePath, 'SELECT Name, InstanceName, OrganizationType FROM Organization LIMIT 1', requestOptions),
      countQuery(basePath, 'SELECT COUNT() FROM User WHERE IsActive = true', requestOptions),
      countQuery(basePath, 'SELECT COUNT() FROM Profile', requestOptions),
      countQuery(basePath, 'SELECT COUNT() FROM PermissionSet WHERE IsOwnedByProfile = false', requestOptions),
      countQuery(basePath, "SELECT COUNT() FROM User WHERE IsActive = true AND UserType = 'Guest'", requestOptions)
    ]);

    const overview = {
      orgName: organization?.Name || orgContext.pageTitle || 'Unknown Org',
      orgType: organization?.OrganizationType || 'Unknown',
      instance: organization?.InstanceName || orgContext.instance,
      apiVersion,
      activeUsers,
      profileCount: profiles,
      permissionSetCount: permissionSets
    };

    const risk = buildInitialRisk(overview, { activeGuestUsers });

    return {
      orgContext,
      overview,
      risk,
      generatedAt: new Date().toISOString()
    };
  }

  async function runProfileInventoryAudit(payload) {
    const orgContext = payload.orgContext || await resolveOrgContext();
    const forceMetadataRefresh = Boolean(payload.forceMetadataRefresh);
    const apiVersion = orgContext.apiVersion;
    const basePath = `/services/data/v${apiVersion}`;
    const requestOptions = buildRestRequestOptions(orgContext);
    const profileQuery = await buildProfileInventoryQuery(basePath, requestOptions);

    const [profilesResponse, userCountsResponse] = await Promise.all([
      queryAll(basePath, profileQuery, requestOptions),
      queryAll(basePath, [
        'SELECT ProfileId profileId, COUNT(Id) userCount',
        'FROM User',
        'WHERE IsActive = true',
        'GROUP BY ProfileId'
      ].join(' '), requestOptions)
    ]);

    const metadataResult = await loadProfileMetadataMap(orgContext, profilesResponse, { forceRefresh: forceMetadataRefresh }).catch((error) => {
      console.warn('[SFSA] Profile metadata enrichment unavailable:', error);
      return {
        metadataByProfileName: new Map(),
        source: 'fallback',
        message: error.message,
        cached: false
      };
    });
    const metadataByProfileName = metadataResult.metadataByProfileName;

    const activeUserCounts = new Map(
      userCountsResponse.map((row) => [row.profileId, row.userCount || 0])
    );

    const rows = profilesResponse.map((profile) => {
      const userCount = activeUserCounts.get(profile.Id) || 0;
      const severity = deriveProfileSeverity(profile);
      const profileMetadata = metadataByProfileName.get(profile.Name) || null;
      const mfaEnabled = Boolean(
        profile.PermissionsMultiFactorAuthenticationForUserInterfaceLogins ||
        profileMetadata?.mfaEnabled
      );

      return {
        id: profile.Id,
        profileName: profile.Name,
        userCount,
        licenseType: profile.UserLicense?.Name || 'Unknown',
        profileType: isCustomProfile(profile.Name) ? 'Custom' : 'Standard',
        apiEnabled: Boolean(profile.PermissionsApiEnabled),
        modifyAllData: Boolean(profile.PermissionsModifyAllData),
        viewAllData: Boolean(profile.PermissionsViewAllData),
        customizeApplication: Boolean(profile.PermissionsCustomizeApplication),
        manageUsers: Boolean(profile.PermissionsManageUsers),
        mfaStatus: mfaEnabled ? 'Enabled' : profileMetadata ? 'Not Enabled' : 'Unavailable',
        sessionRestrictions: profileMetadata?.sessionRestrictions || 'Unavailable',
        loginIpRestrictions: profileMetadata?.loginIpRestrictions || 'Unavailable',
        severity
      };
    });

    return {
      orgContext,
      generatedAt: new Date().toISOString(),
      summary: {
        totalProfiles: rows.length,
        customProfiles: rows.filter((row) => row.profileType === 'Custom').length,
        highRiskProfiles: rows.filter((row) => row.severity === 'high').length,
        apiEnabledProfiles: rows.filter((row) => row.apiEnabled).length,
        metadataEnrichedProfiles: rows.filter((row) => row.mfaStatus !== 'Unavailable' || row.sessionRestrictions !== 'Unavailable' || row.loginIpRestrictions !== 'Unavailable').length,
        enrichmentSource: metadataResult.source,
        enrichmentCached: metadataResult.cached,
        enrichmentMessage: metadataResult.message
      },
      rows
    };
  }

  async function buildProfileInventoryQuery(basePath, requestOptions) {
    const preferredQuery = [
      'SELECT Id, Name, PermissionsApiEnabled, PermissionsModifyAllData,',
      'PermissionsViewAllData, PermissionsCustomizeApplication, PermissionsManageUsers,',
      'PermissionsMultiFactorAuthenticationForUserInterfaceLogins,',
      'UserLicense.Name',
      'FROM Profile',
      'ORDER BY Name'
    ].join(' ');

    try {
      await queryOne(basePath, preferredQuery, requestOptions);
      return preferredQuery;
    } catch (error) {
      if (!shouldFallbackProfileInventoryQuery(error)) {
        throw error;
      }

      return [
        'SELECT Id, Name, PermissionsApiEnabled, PermissionsModifyAllData,',
        'PermissionsViewAllData, PermissionsCustomizeApplication, PermissionsManageUsers,',
        'UserLicense.Name',
        'FROM Profile',
        'ORDER BY Name'
      ].join(' ');
    }
  }

  function shouldFallbackProfileInventoryQuery(error) {
    const message = error?.message || '';

    return /No such column|INVALID_FIELD|MALFORMED_QUERY|PermissionsMultiFactorAuthenticationForUserInterfaceLogins/i.test(message);
  }

  async function loadProfileMetadataMap(orgContext, profilesResponse, options = {}) {
    const orgInfo = getMetadataOrgInfo(orgContext);
    const forceRefresh = Boolean(options.forceRefresh);
    const profileNames = profilesResponse.map((profile) => profile.Name).filter(Boolean);
    const cacheKey = buildProfileMetadataCacheKey(orgInfo, profileNames);
    const cachedEntry = metadataCache.profileMetadata.get(cacheKey);

    if (!profileNames.length) {
      return {
        metadataByProfileName: new Map(),
        source: 'empty',
        cached: false,
        message: 'No profile names available for metadata enrichment.'
      };
    }

    if (!forceRefresh && cachedEntry && Date.now() - cachedEntry.createdAt < PROFILE_METADATA_CACHE_TTL_MS) {
      return {
        metadataByProfileName: cachedEntry.metadataByProfileName,
        source: 'metadata-cache',
        cached: true,
        message: `Using cached metadata enrichment from ${new Date(cachedEntry.createdAt).toLocaleTimeString()}.`
      };
    }

    const { SalesforceMetadataAPI } = await loadSalesforceHelpers();
    const metadataApi = new SalesforceMetadataAPI(orgInfo);
    const packageXml = buildProfilePackageXml(orgInfo.apiVersion, profileNames);
    const retrieveId = await metadataApi.retrieve(packageXml);
    const retrieveResult = await waitForMetadataRetrieve(metadataApi, retrieveId);
    const profileXmlMap = await extractProfileMetadataFiles(retrieveResult.zipFile);
    const metadataByProfileName = parseProfileMetadataMap(profileXmlMap);

    metadataCache.profileMetadata.set(cacheKey, {
      createdAt: Date.now(),
      metadataByProfileName
    });

    return {
      metadataByProfileName,
      source: 'metadata-retrieve',
      cached: false,
      message: `Retrieved metadata for ${metadataByProfileName.size} profiles.`
    };
  }

  async function runSystemPermissionsAudit(payload) {
    const orgContext = payload.orgContext || await resolveOrgContext();
    const apiVersion = orgContext.apiVersion;
    const basePath = `/services/data/v${apiVersion}`;
    const requestOptions = buildRestRequestOptions(orgContext);
    const permissionCatalog = await resolveSupportedSystemPermissionCatalog(basePath, requestOptions, getSystemPermissionCatalog());
    const selectedFields = permissionCatalog.map((item) => item.field).join(', ');

    const [profilesResponse, permissionSetsResponse] = await Promise.all([
      queryAll(basePath, `SELECT Id, Name, ${selectedFields} FROM Profile ORDER BY Name`, requestOptions),
      queryAll(basePath, `SELECT Id, Label, Name, IsOwnedByProfile, ${selectedFields} FROM PermissionSet WHERE IsOwnedByProfile = false ORDER BY Label`, requestOptions)
    ]);

    const rows = [
      ...buildPermissionRows('Profile', profilesResponse, permissionCatalog),
      ...buildPermissionRows('Permission Set', permissionSetsResponse, permissionCatalog, {
        labelField: 'Label'
      })
    ];

    return {
      orgContext,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRows: rows.length,
        highRiskRows: rows.filter((row) => row.severity === 'high').length,
        mediumRiskRows: rows.filter((row) => row.severity === 'medium').length,
        principalCount: new Set(rows.map((row) => `${row.principalType}:${row.principalName}`)).size
      },
      rows
    };
  }

  async function resolveSupportedSystemPermissionCatalog(basePath, requestOptions, permissionCatalog) {
    const supportedCatalog = [];

    for (const permission of permissionCatalog) {
      if (await isSupportedSystemPermissionField(basePath, requestOptions, permission.field)) {
        supportedCatalog.push(permission);
      }
    }

    if (!supportedCatalog.length) {
      throw new Error('No supported system permission fields were available for this org.');
    }

    return supportedCatalog;
  }

  async function isSupportedSystemPermissionField(basePath, requestOptions, fieldName) {
    try {
      await Promise.all([
        queryOne(basePath, `SELECT Id, Name, ${fieldName} FROM Profile LIMIT 1`, requestOptions),
        queryOne(basePath, `SELECT Id, Label, Name, IsOwnedByProfile, ${fieldName} FROM PermissionSet WHERE IsOwnedByProfile = false LIMIT 1`, requestOptions)
      ]);
      return true;
    } catch (error) {
      if (isUnsupportedSystemPermissionField(error, fieldName)) {
        return false;
      }

      throw error;
    }
  }

  async function runObjectAccessAudit(payload) {
    const orgContext = payload.orgContext || await resolveOrgContext();
    const apiVersion = orgContext.apiVersion;
    const basePath = `/services/data/v${apiVersion}`;
    const requestOptions = buildRestRequestOptions(orgContext);
    const objectPermissionFields = [
      'ParentId',
      'Parent.Name',
      'Parent.Label',
      'Parent.IsOwnedByProfile',
      'SObjectType',
      'PermissionsRead',
      'PermissionsCreate',
      'PermissionsEdit',
      'PermissionsDelete',
      'PermissionsViewAllRecords',
      'PermissionsModifyAllRecords'
    ].join(', ');

    const [profileRows, permissionSetRows, groupComponents] = await Promise.all([
      queryAll(basePath, `SELECT ${objectPermissionFields} FROM ObjectPermissions WHERE Parent.IsOwnedByProfile = true ORDER BY Parent.Name, SObjectType`, requestOptions),
      queryAll(basePath, `SELECT ${objectPermissionFields} FROM ObjectPermissions WHERE Parent.IsOwnedByProfile = false ORDER BY Parent.Label, SObjectType`, requestOptions),
      queryAll(basePath, [
        'SELECT PermissionSetGroupId, PermissionSetId, PermissionSetGroup.MasterLabel',
        'FROM PermissionSetGroupComponent'
      ].join(' '), requestOptions)
    ]);

    const permissionSetAccessRows = permissionSetRows.map((row) => buildObjectAccessRow('Permission Set', row.Parent?.Label || row.Parent?.Name || 'Unknown', row));
    const profileAccessRows = profileRows.map((row) => buildObjectAccessRow('Profile', row.Parent?.Name || 'Unknown', row));
    const permissionSetRowsById = groupBy(permissionSetRows, (row) => row.ParentId);
    const permissionSetGroupRows = buildPermissionSetGroupObjectAccessRows(groupComponents, permissionSetRowsById);
    const rows = [...profileAccessRows, ...permissionSetAccessRows, ...permissionSetGroupRows];

    return {
      orgContext,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRows: rows.length,
        profileRows: profileAccessRows.length,
        permissionSetRows: permissionSetAccessRows.length,
        permissionSetGroupRows: permissionSetGroupRows.length,
        highRiskRows: rows.filter((row) => row.severity === 'high').length
      },
      rows
    };
  }

  async function runMetadataInventoryAudit(payload) {
    const orgContext = payload.orgContext || await resolveOrgContext();
    const forceMetadataRefresh = Boolean(payload.forceMetadataRefresh);
    const orgInfo = getMetadataOrgInfo(orgContext);
    const cacheKey = buildMetadataInventoryCacheKey(orgInfo);
    const cachedEntry = metadataCache.inventory.get(cacheKey);

    if (!forceMetadataRefresh && cachedEntry && Date.now() - cachedEntry.createdAt < METADATA_INVENTORY_CACHE_TTL_MS) {
      return {
        ...cachedEntry.result,
        generatedAt: new Date().toISOString(),
        summary: {
          ...cachedEntry.result.summary,
          inventorySource: 'metadata-cache',
          inventoryMessage: `Using cached metadata inventory from ${new Date(cachedEntry.createdAt).toLocaleTimeString()}.`
        }
      };
    }

    const { SalesforceMetadataAPI, SalesforceMembers } = await loadSalesforceHelpers();
    const metadataApi = new SalesforceMetadataAPI(orgInfo);
    const membersClient = new SalesforceMembers({
      apiVersion: orgInfo.apiVersion,
      orgInfo: {
        sessionId: orgInfo.sessionId,
        instanceUrl: orgInfo.instanceUrl
      }
    });

    const [metadataTypes, apexClasses, customObjects, profiles, permissionSets] = await Promise.all([
      metadataApi.describeMetadata(),
      membersClient.getMembers('ApexClass'),
      membersClient.getMembers('CustomObject'),
      membersClient.getMembers('Profile'),
      membersClient.getMembers('PermissionSet')
    ]);

    const result = {
      orgContext,
      generatedAt: new Date().toISOString(),
      summary: {
        metadataTypes: metadataTypes.length,
        apexClasses: apexClasses.length,
        customObjects: customObjects.length,
        profiles: profiles.length,
        permissionSets: permissionSets.length,
        inventorySource: 'metadata-retrieve',
        inventoryMessage: `Retrieved ${metadataTypes.length} metadata types and core member counts.`
      },
      metadataTypes: metadataTypes.slice(0, 50)
    };

    metadataCache.inventory.set(cacheKey, {
      createdAt: Date.now(),
      result
    });

    return result;
  }

  async function queryOne(basePath, soql, requestOptions) {
    const response = await fetchJson(`${basePath}/query?q=${encodeURIComponent(soql)}`, requestOptions);
    return response.records?.[0] || null;
  }

  async function countQuery(basePath, soql, requestOptions) {
    const response = await fetchJson(`${basePath}/query?q=${encodeURIComponent(soql)}`, requestOptions);
    return response.totalSize || 0;
  }

  async function queryAll(basePath, soql, requestOptions) {
    const records = [];
    let nextPath = `${basePath}/query?q=${encodeURIComponent(soql)}`;

    while (nextPath) {
      const response = await fetchJson(nextPath, requestOptions);
      records.push(...(response.records || []));
      nextPath = response.nextRecordsUrl || null;
    }

    return records;
  }

  async function fetchJson(path, options = {}) {
    const response = await fetch(buildRestUrl(path, options.instanceUrl), {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.sessionId ? { Authorization: `Bearer ${options.sessionId}` } : {}),
        ...(options.headers || {})
      },
      body: options.body
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(formatSalesforceRequestError(response.status, message));
    }

    return response.json();
  }

  function buildRestRequestOptions(orgContext) {
    return {
      instanceUrl: orgContext.instanceUrl || orgContext.orgUrl || window.location.origin,
      sessionId: orgContext.sessionId || null
    };
  }

  function buildRestUrl(path, instanceUrl) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${instanceUrl || window.location.origin}${path}`;
  }

  function formatSalesforceRequestError(status, message) {
    const snippet = message.slice(0, 180);

    if (status === 401 && /INVALID_SESSION_ID|Session expired or invalid/i.test(message)) {
      return `Salesforce request failed (${status}): session expired or invalid. Reconnect to an active Salesforce tab and try again.`;
    }

    return `Salesforce request failed (${status}): ${snippet}`;
  }

  function buildInitialRisk(overview, signals) {
    const findings = [];
    let score = 100;

    if (signals.activeGuestUsers > 0) {
      findings.push({
        severity: 'high',
        category: 'Guest Access',
        title: 'Active guest users detected',
        recommendation: 'Review guest profiles, site visibility, and public sharing exposure.'
      });
      score -= 25;
    }

    if (!overview.profileCount) {
      findings.push({
        severity: 'medium',
        category: 'Inventory',
        title: 'Profile inventory could not be confirmed',
        recommendation: 'Verify API access and extend the audit queries for profile metadata.'
      });
      score -= 10;
    }

    return {
      score,
      findings,
      summary: findings.length ? `${findings.length} initial finding(s) detected.` : 'No initial high-signal findings detected.'
    };
  }

  function deriveProfileSeverity(profile) {
    if (profile.PermissionsModifyAllData || profile.PermissionsManageUsers) {
      return 'high';
    }

    if (profile.PermissionsViewAllData || profile.PermissionsCustomizeApplication || profile.PermissionsApiEnabled) {
      return 'medium';
    }

    return 'low';
  }

  function isCustomProfile(profileName) {
    return /custom/i.test(profileName) || /clone/i.test(profileName);
  }

  function getSystemPermissionCatalog() {
    return [
      {
        field: 'PermissionsModifyAllData',
        label: 'Modify All Data',
        severity: 'high',
        category: 'Data Control',
        recommendation: 'Restrict this permission to a minimal break-glass admin set.'
      },
      {
        field: 'PermissionsViewAllData',
        label: 'View All Data',
        severity: 'high',
        category: 'Data Visibility',
        recommendation: 'Review whether broad read access is required for this principal.'
      },
      {
        field: 'PermissionsAuthorApex',
        label: 'Author Apex',
        severity: 'high',
        category: 'Code Execution',
        recommendation: 'Limit code authoring to tightly governed development roles.'
      },
      {
        field: 'PermissionsApiEnabled',
        label: 'API Enabled',
        severity: 'medium',
        category: 'Integration',
        recommendation: 'Ensure API-enabled principals are justified and monitored.'
      },
      {
        field: 'PermissionsCustomizeApplication',
        label: 'Customize Application',
        severity: 'medium',
        category: 'Configuration',
        recommendation: 'Review configuration privileges for least-privilege alignment.'
      },
      {
        field: 'PermissionsManageProfilesPermissionsets',
        label: 'Manage Profiles and Permission Sets',
        severity: 'high',
        category: 'Access Administration',
        recommendation: 'Restrict delegated access administration to a limited set of admins.'
      },
      {
        field: 'PermissionsManageUsers',
        label: 'Manage Users',
        severity: 'high',
        category: 'Identity Administration',
        recommendation: 'Limit user administration rights and review them regularly.'
      },
      {
        field: 'PermissionsDeployChangeSets',
        label: 'Deploy Change Sets',
        severity: 'medium',
        category: 'Release Management',
        recommendation: 'Keep deployment rights limited to controlled release roles.'
      },
      {
        field: 'PermissionsViewSetup',
        label: 'View Setup and Configuration',
        severity: 'medium',
        category: 'Configuration Visibility',
        recommendation: 'Review setup visibility if configuration information is sensitive.'
      },
      {
        field: 'PermissionsExportReport',
        label: 'Export Reports',
        severity: 'medium',
        category: 'Data Exfiltration',
        recommendation: 'Pair report export with monitoring and data handling controls.'
      },
      {
        field: 'PermissionsViewEncryptedData',
        label: 'View Encrypted Data',
        severity: 'high',
        category: 'Sensitive Data Access',
        recommendation: 'Restrict decrypted data visibility to approved business-critical roles.'
      }
    ];
  }

  function isUnsupportedSystemPermissionField(error, fieldName) {
    const message = error?.message || '';
    return message.includes(fieldName) || /INVALID_FIELD|MALFORMED_QUERY|No such column/i.test(message);
  }

  function buildPermissionRows(principalType, principals, permissionCatalog, options = {}) {
    const labelField = options.labelField || 'Name';
    const rows = [];

    for (const principal of principals) {
      for (const permission of permissionCatalog) {
        if (!principal[permission.field]) {
          continue;
        }

        rows.push({
          principalType,
          principalName: principal[labelField] || principal.Name || 'Unknown',
          permissionLabel: permission.label,
          severity: permission.severity,
          category: permission.category,
          recommendation: permission.recommendation
        });
      }
    }

    return rows;
  }

  function buildObjectAccessRow(principalType, principalName, sourceRow) {
    const permissions = {
      read: Boolean(sourceRow.PermissionsRead),
      create: Boolean(sourceRow.PermissionsCreate),
      edit: Boolean(sourceRow.PermissionsEdit),
      delete: Boolean(sourceRow.PermissionsDelete),
      viewAll: Boolean(sourceRow.PermissionsViewAllRecords),
      modifyAll: Boolean(sourceRow.PermissionsModifyAllRecords)
    };

    return {
      principalType,
      principalName,
      objectName: sourceRow.SObjectType,
      objectCategory: classifyObjectType(sourceRow.SObjectType),
      ...permissions,
      severity: deriveObjectAccessSeverity(permissions)
    };
  }

  function buildPermissionSetGroupObjectAccessRows(groupComponents, permissionSetRowsById) {
    const componentsByGroup = groupBy(groupComponents, (component) => component.PermissionSetGroupId);
    const rows = [];

    for (const components of componentsByGroup.values()) {
      const groupName = components[0]?.PermissionSetGroup?.MasterLabel || 'Unknown Group';
      const objectMap = new Map();

      for (const component of components) {
        const permissionRows = permissionSetRowsById.get(component.PermissionSetId) || [];

        for (const permissionRow of permissionRows) {
          const existing = objectMap.get(permissionRow.SObjectType) || {
            PermissionsRead: false,
            PermissionsCreate: false,
            PermissionsEdit: false,
            PermissionsDelete: false,
            PermissionsViewAllRecords: false,
            PermissionsModifyAllRecords: false
          };

          existing.PermissionsRead ||= Boolean(permissionRow.PermissionsRead);
          existing.PermissionsCreate ||= Boolean(permissionRow.PermissionsCreate);
          existing.PermissionsEdit ||= Boolean(permissionRow.PermissionsEdit);
          existing.PermissionsDelete ||= Boolean(permissionRow.PermissionsDelete);
          existing.PermissionsViewAllRecords ||= Boolean(permissionRow.PermissionsViewAllRecords);
          existing.PermissionsModifyAllRecords ||= Boolean(permissionRow.PermissionsModifyAllRecords);
          objectMap.set(permissionRow.SObjectType, existing);
        }
      }

      for (const [objectName, permissionFlags] of objectMap.entries()) {
        rows.push(buildObjectAccessRow('Permission Set Group', groupName, {
          SObjectType: objectName,
          ...permissionFlags
        }));
      }
    }

    return rows;
  }

  function classifyObjectType(objectName) {
    if (!objectName) {
      return 'Unknown';
    }

    if (/^[A-Za-z0-9]+__[A-Za-z0-9]+__c$/.test(objectName)) {
      return 'Managed Package';
    }

    if (objectName.endsWith('__c')) {
      return 'Custom';
    }

    return 'Standard';
  }

  function deriveObjectAccessSeverity(permissions) {
    if (permissions.modifyAll || permissions.delete || permissions.viewAll) {
      return 'high';
    }

    if (permissions.edit || permissions.create) {
      return 'medium';
    }

    return 'low';
  }

  function groupBy(items, getKey) {
    const map = new Map();

    for (const item of items) {
      const key = getKey(item);
      const group = map.get(key) || [];
      group.push(item);
      map.set(key, group);
    }

    return map;
  }

  async function loadSalesforceHelpers() {
    const [apiModule, membersModule] = await Promise.all([
      import(chrome.runtime.getURL('src/salesforce-scripts/salesforce-api.js')),
      import(chrome.runtime.getURL('src/salesforce-scripts/salesforce-members.js'))
    ]);

    return {
      SalesforceMetadataAPI: apiModule.SalesforceMetadataAPI,
      SalesforceMembers: membersModule.SalesforceMembers
    };
  }

  async function loadZipLibrary() {
    if (globalThis.JSZip?.loadAsync) {
      return globalThis.JSZip;
    }

    await import(chrome.runtime.getURL('src/lib/jszip.min.js'));

    if (!globalThis.JSZip?.loadAsync) {
      throw new Error('JSZip could not be loaded for metadata parsing.');
    }

    return globalThis.JSZip;
  }

  function getMetadataOrgInfo(orgContext) {
    if (!orgContext.sessionId) {
      throw new Error('Salesforce session cookie not available for metadata APIs. Reopen the app from an authenticated Salesforce tab.');
    }

    return {
      url: orgContext.instanceUrl || orgContext.orgUrl,
      instanceUrl: orgContext.instanceUrl || orgContext.orgUrl,
      sessionId: orgContext.sessionId,
      apiVersion: orgContext.apiVersion
    };
  }

  function buildProfilePackageXml(apiVersion, profileNames) {
    const profileMembers = profileNames.map((name) => `    <members>${escapeXml(name)}</members>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
${profileMembers}
    <name>Profile</name>
  </types>
  <version>${apiVersion}</version>
</Package>`;
  }

  function buildProfileMetadataCacheKey(orgInfo, profileNames) {
    return [
      orgInfo.instanceUrl,
      orgInfo.apiVersion,
      ...profileNames.slice().sort()
    ].join('|');
  }

  function buildMetadataInventoryCacheKey(orgInfo) {
    return [orgInfo.instanceUrl, orgInfo.apiVersion, 'metadata-inventory'].join('|');
  }

  async function waitForMetadataRetrieve(metadataApi, retrieveId) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await metadataApi.checkRetrieveStatus(retrieveId);

      if (status.done && status.success && status.zipFile) {
        return status;
      }

      if (status.done && !status.success) {
        throw new Error(status.errorMessage || `Metadata retrieve failed with state ${status.state}.`);
      }

      await delay(750);
    }

    throw new Error('Timed out waiting for profile metadata retrieve.');
  }

  async function extractProfileMetadataFiles(base64Zip) {
    const JSZip = await loadZipLibrary();
    const zip = await JSZip.loadAsync(base64Zip, { base64: true });
    const profileEntries = zip.file(/profiles\/.*\.profile-meta\.xml$/i);
    const results = new Map();

    for (const entry of profileEntries) {
      const text = await entry.async('string');
      const profileName = entry.name.split('/').pop().replace(/\.profile-meta\.xml$/i, '');
      results.set(profileName, text);
    }

    return results;
  }

  function parseProfileMetadataMap(profileXmlMap) {
    const metadataMap = new Map();

    for (const [profileName, xmlText] of profileXmlMap.entries()) {
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      metadataMap.set(profileName, {
        mfaEnabled: hasProfileUserPermission(doc, 'MultiFactorAuthenticationForUserInterfaceLogins'),
        sessionRestrictions: extractSessionRestrictions(doc),
        loginIpRestrictions: extractLoginIpRestrictions(doc)
      });
    }

    return metadataMap;
  }

  function hasProfileUserPermission(doc, permissionName) {
    const userPermissions = Array.from(doc.getElementsByTagName('userPermissions'));

    return userPermissions.some((node) => {
      const name = node.getElementsByTagName('name')[0]?.textContent || '';
      const enabled = node.getElementsByTagName('enabled')[0]?.textContent || 'false';
      return name === permissionName && enabled === 'true';
    });
  }

  function extractSessionRestrictions(doc) {
    const sessionTimeout = doc.getElementsByTagName('sessionTimeout')[0]?.textContent || null;
    const sessionWarning = doc.getElementsByTagName('sessionTimeoutWarning')[0]?.textContent || null;

    if (!sessionTimeout && !sessionWarning) {
      return 'Default / Not Defined';
    }

    return [
      sessionTimeout ? `Timeout: ${sessionTimeout}` : null,
      sessionWarning ? `Warning: ${sessionWarning}` : null
    ].filter(Boolean).join(' | ');
  }

  function extractLoginIpRestrictions(doc) {
    const ranges = Array.from(doc.getElementsByTagName('loginIpRanges'));

    if (!ranges.length) {
      return 'None Defined';
    }

    if (ranges.length === 1) {
      const start = ranges[0].getElementsByTagName('startAddress')[0]?.textContent || '?';
      const end = ranges[0].getElementsByTagName('endAddress')[0]?.textContent || '?';
      return `${start} - ${end}`;
    }

    return `${ranges.length} ranges defined`;
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
})();