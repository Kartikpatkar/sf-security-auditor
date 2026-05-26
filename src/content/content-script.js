(function initializeContentRuntime() {
  const PAGE_CONTEXT_EVENT = 'sfsa:page-context';
  let latestPageContext = null;

  injectPageBridge();
  document.addEventListener(PAGE_CONTEXT_EVENT, handlePageContext);

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
    const apiVersion = await resolveApiVersion(discoveredContext.apiVersion);
    const sessionContext = await resolveSessionContext(discoveredContext.orgUrl);

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

  async function resolveApiVersion(preferredVersion) {
    try {
      const versions = await fetchJson('/services/data/');

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

    const [organization, activeUsers, profiles, permissionSets, activeGuestUsers] = await Promise.all([
      queryOne(basePath, 'SELECT Name, InstanceName, OrganizationType FROM Organization LIMIT 1'),
      countQuery(basePath, 'SELECT COUNT() FROM User WHERE IsActive = true'),
      countQuery(basePath, 'SELECT COUNT() FROM Profile'),
      countQuery(basePath, 'SELECT COUNT() FROM PermissionSet WHERE IsOwnedByProfile = false'),
      countQuery(basePath, "SELECT COUNT() FROM User WHERE IsActive = true AND UserType = 'Guest'")
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
    const apiVersion = orgContext.apiVersion;
    const basePath = `/services/data/v${apiVersion}`;

    const [profilesResponse, userCountsResponse] = await Promise.all([
      queryAll(basePath, [
        'SELECT Id, Name, PermissionsApiEnabled, PermissionsModifyAllData,',
        'PermissionsViewAllData, PermissionsCustomizeApplication, PermissionsManageUsers,',
        'UserLicense.Name',
        'FROM Profile',
        'ORDER BY Name'
      ].join(' ')),
      queryAll(basePath, [
        'SELECT ProfileId profileId, COUNT(Id) userCount',
        'FROM User',
        'WHERE IsActive = true',
        'GROUP BY ProfileId'
      ].join(' '))
    ]);

    const activeUserCounts = new Map(
      userCountsResponse.map((row) => [row.profileId, row.userCount || 0])
    );

    const rows = profilesResponse.map((profile) => {
      const userCount = activeUserCounts.get(profile.Id) || 0;
      const severity = deriveProfileSeverity(profile);

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
        mfaStatus: 'Requires metadata/session policy audit',
        sessionRestrictions: 'Requires metadata audit',
        loginIpRestrictions: 'Requires metadata audit',
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
        apiEnabledProfiles: rows.filter((row) => row.apiEnabled).length
      },
      rows
    };
  }

  async function runSystemPermissionsAudit(payload) {
    const orgContext = payload.orgContext || await resolveOrgContext();
    const apiVersion = orgContext.apiVersion;
    const basePath = `/services/data/v${apiVersion}`;
    const permissionCatalog = getSystemPermissionCatalog();
    const selectedFields = permissionCatalog.map((item) => item.field).join(', ');

    const [profilesResponse, permissionSetsResponse] = await Promise.all([
      queryAll(basePath, `SELECT Id, Name, ${selectedFields} FROM Profile ORDER BY Name`),
      queryAll(basePath, `SELECT Id, Label, Name, IsOwnedByProfile, ${selectedFields} FROM PermissionSet WHERE IsOwnedByProfile = false ORDER BY Label`)
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

  async function runObjectAccessAudit(payload) {
    const orgContext = payload.orgContext || await resolveOrgContext();
    const apiVersion = orgContext.apiVersion;
    const basePath = `/services/data/v${apiVersion}`;
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
      queryAll(basePath, `SELECT ${objectPermissionFields} FROM ObjectPermissions WHERE Parent.IsOwnedByProfile = true ORDER BY Parent.Name, SObjectType`),
      queryAll(basePath, `SELECT ${objectPermissionFields} FROM ObjectPermissions WHERE Parent.IsOwnedByProfile = false ORDER BY Parent.Label, SObjectType`),
      queryAll(basePath, [
        'SELECT PermissionSetGroupId, PermissionSetId, PermissionSetGroup.MasterLabel',
        'FROM PermissionSetGroupComponent'
      ].join(' '))
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
    const orgInfo = getMetadataOrgInfo(orgContext);
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

    return {
      orgContext,
      generatedAt: new Date().toISOString(),
      summary: {
        metadataTypes: metadataTypes.length,
        apexClasses: apexClasses.length,
        customObjects: customObjects.length,
        profiles: profiles.length,
        permissionSets: permissionSets.length
      },
      metadataTypes: metadataTypes.slice(0, 50)
    };
  }

  async function queryOne(basePath, soql) {
    const response = await fetchJson(`${basePath}/query?q=${encodeURIComponent(soql)}`);
    return response.records?.[0] || null;
  }

  async function countQuery(basePath, soql) {
    const response = await fetchJson(`${basePath}/query?q=${encodeURIComponent(soql)}`);
    return response.totalSize || 0;
  }

  async function queryAll(basePath, soql) {
    const records = [];
    let nextPath = `${basePath}/query?q=${encodeURIComponent(soql)}`;

    while (nextPath) {
      const response = await fetchJson(nextPath);
      records.push(...(response.records || []));
      nextPath = response.nextRecordsUrl || null;
    }

    return records;
  }

  async function fetchJson(path, options = {}) {
    const response = await fetch(`${window.location.origin}${path}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      },
      body: options.body
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Salesforce request failed (${response.status}): ${message.slice(0, 180)}`);
    }

    return response.json();
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

  function getMetadataOrgInfo(orgContext) {
    if (!orgContext.sessionId) {
      throw new Error('Salesforce session cookie not available for metadata APIs. Reopen the app from an authenticated Salesforce tab.');
    }

    return {
      url: orgContext.orgUrl,
      instanceUrl: orgContext.instanceUrl || orgContext.orgUrl,
      sessionId: orgContext.sessionId,
      apiVersion: orgContext.apiVersion
    };
  }
})();