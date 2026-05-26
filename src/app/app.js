const state = {
  sourceTabId: null,
  orgContext: null,
  activeView: 'overview'
};

const elements = {
  detectButton: document.querySelector('#detect-org-button'),
  runButton: document.querySelector('#run-audit-button'),
  runProfileInventoryButton: document.querySelector('#run-profile-inventory-button'),
  runSystemPermissionsButton: document.querySelector('#run-system-permissions-button'),
  runObjectAccessButton: document.querySelector('#run-object-access-button'),
  runMetadataInventoryButton: document.querySelector('#run-metadata-inventory-button'),
  useCurrentTabButton: document.querySelector('#use-current-tab-button'),
  navOverview: document.querySelector('#nav-overview'),
  navProfiles: document.querySelector('#nav-profiles'),
  navPermissions: document.querySelector('#nav-permissions'),
  navObjectAccess: document.querySelector('#nav-object-access'),
  navMetadata: document.querySelector('#nav-metadata'),
  overviewView: document.querySelector('#view-overview'),
  profilesView: document.querySelector('#view-profiles'),
  permissionsView: document.querySelector('#view-permissions'),
  objectAccessView: document.querySelector('#view-object-access'),
  metadataView: document.querySelector('#view-metadata'),
  connectionStatus: document.querySelector('#connection-status'),
  statusMessage: document.querySelector('#status-message'),
  sourceTabId: document.querySelector('#source-tab-id'),
  sourceOrigin: document.querySelector('#source-origin'),
  orgName: document.querySelector('#org-name'),
  orgInstance: document.querySelector('#org-instance'),
  apiVersion: document.querySelector('#api-version'),
  securityScore: document.querySelector('#security-score'),
  activeUsers: document.querySelector('#active-users'),
  profileCount: document.querySelector('#profile-count'),
  permissionSetCount: document.querySelector('#permission-set-count'),
  uiType: document.querySelector('#ui-type'),
  orgType: document.querySelector('#org-type'),
  findingCount: document.querySelector('#finding-count'),
  findingsList: document.querySelector('#findings-list'),
  profilesTotal: document.querySelector('#profiles-total'),
  profilesCustom: document.querySelector('#profiles-custom'),
  profilesApiEnabled: document.querySelector('#profiles-api-enabled'),
  profilesHighRisk: document.querySelector('#profiles-high-risk'),
  profileRowCount: document.querySelector('#profile-row-count'),
  profileTableBody: document.querySelector('#profile-table-body'),
  permissionsTotalRows: document.querySelector('#permissions-total-rows'),
  permissionsPrincipals: document.querySelector('#permissions-principals'),
  permissionsHighRisk: document.querySelector('#permissions-high-risk'),
  permissionsMediumRisk: document.querySelector('#permissions-medium-risk'),
  permissionsRowCount: document.querySelector('#permissions-row-count'),
  permissionsTableBody: document.querySelector('#permissions-table-body'),
  objectAccessTotalRows: document.querySelector('#object-access-total-rows'),
  objectAccessProfileRows: document.querySelector('#object-access-profile-rows'),
  objectAccessPermissionSetRows: document.querySelector('#object-access-permission-set-rows'),
  objectAccessHighRisk: document.querySelector('#object-access-high-risk'),
  objectAccessRowCount: document.querySelector('#object-access-row-count'),
  objectAccessTableBody: document.querySelector('#object-access-table-body'),
  metadataTypesCount: document.querySelector('#metadata-types-count'),
  metadataApexCount: document.querySelector('#metadata-apex-count'),
  metadataCustomObjectCount: document.querySelector('#metadata-custom-object-count'),
  metadataPermissionSetCount: document.querySelector('#metadata-permission-set-count'),
  metadataRowCount: document.querySelector('#metadata-row-count'),
  metadataTableBody: document.querySelector('#metadata-table-body')
};

initialize();

async function initialize() {
  elements.detectButton.addEventListener('click', handleDetectOrg);
  elements.runButton.addEventListener('click', handleRunAudit);
  elements.runProfileInventoryButton.addEventListener('click', handleRunProfileInventory);
  elements.runSystemPermissionsButton.addEventListener('click', handleRunSystemPermissions);
  elements.runObjectAccessButton.addEventListener('click', handleRunObjectAccess);
  elements.runMetadataInventoryButton.addEventListener('click', handleRunMetadataInventory);
  elements.useCurrentTabButton.addEventListener('click', handleUseCurrentTab);
  elements.navOverview.addEventListener('click', () => setActiveView('overview'));
  elements.navProfiles.addEventListener('click', () => setActiveView('profiles'));
  elements.navPermissions.addEventListener('click', () => setActiveView('permissions'));
  elements.navObjectAccess.addEventListener('click', () => setActiveView('object-access'));
  elements.navMetadata.addEventListener('click', () => setActiveView('metadata'));

  const response = await chrome.runtime.sendMessage({ type: 'sfsa:getLaunchContext' });
  const launchContext = response?.ok ? response.data : null;

  setActiveView('overview');

  if (launchContext?.sourceTabId) {
    state.sourceTabId = launchContext.sourceTabId;
    updateSourcePanel(launchContext.sourceTabId, launchContext.sourceUrl);
    await handleDetectOrg();
    return;
  }

  setStatus('No Salesforce source tab', 'Open the app from a Salesforce tab, or use the reconnect action below.', 'warning');
  elements.runButton.disabled = true;
}

async function handleUseCurrentTab() {
  setBusy(true);

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true, highlighted: true });
    const candidate = tabs.find((tab) => tab.id && tab.url && isSupportedSalesforceUrl(tab.url) && !isExtensionPage(tab.url));

    if (!candidate?.id) {
      throw new Error('Select a Salesforce tab in the current window, then try again.');
    }

    state.sourceTabId = candidate.id;
    updateSourcePanel(candidate.id, candidate.url);

    await chrome.runtime.sendMessage({
      type: 'sfsa:setLaunchContext',
      payload: {
        sourceTabId: candidate.id,
        sourceUrl: candidate.url,
        openedAt: Date.now()
      }
    });

    await handleDetectOrg();
  } catch (error) {
    setStatus('Reconnect failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function handleDetectOrg() {
  if (!state.sourceTabId) {
    setStatus('No source tab', 'Choose a Salesforce tab before detecting org context.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Detecting org', 'Reading org context from the linked Salesforce tab...');

  try {
    const response = await chrome.tabs.sendMessage(state.sourceTabId, { type: 'sfsa:getOrgContext' });

    if (!response?.ok) {
      throw new Error(response?.error || 'Could not read org context.');
    }

    state.orgContext = response.data;
    updateSourcePanel(state.sourceTabId, state.orgContext.orgUrl);
    renderOrgContext(state.orgContext);
    elements.runButton.disabled = false;
    setStatus('Connected', `Detected ${state.orgContext.orgUrl} using ${state.orgContext.connectionMode}.`);
  } catch (error) {
    state.orgContext = null;
    elements.runButton.disabled = true;
    setStatus('Connection failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function handleRunAudit() {
  if (!state.sourceTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running the audit.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Running overview audit', 'Collecting org overview metrics from the linked Salesforce tab...');

  try {
    const response = await chrome.tabs.sendMessage(state.sourceTabId, {
      type: 'sfsa:runOverviewAudit',
      payload: { orgContext: state.orgContext }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Overview audit failed.');
    }

    renderAuditResult(response.data);
    setActiveView('overview');
    setStatus('Audit complete', `Overview audit generated at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`);
  } catch (error) {
    setStatus('Audit failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function handleRunProfileInventory() {
  if (!state.sourceTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running profile inventory.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Running profile inventory', 'Collecting profile-level access and active-user counts from the linked Salesforce tab...');

  try {
    const response = await chrome.tabs.sendMessage(state.sourceTabId, {
      type: 'sfsa:runProfileInventoryAudit',
      payload: { orgContext: state.orgContext }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Profile inventory failed.');
    }

    renderProfileInventory(response.data);
    setActiveView('profiles');
    setStatus('Profile inventory complete', `Loaded ${response.data.summary.totalProfiles} profiles at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`);
  } catch (error) {
    setStatus('Profile inventory failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function handleRunSystemPermissions() {
  if (!state.sourceTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running system permissions.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Running system permissions', 'Collecting high-value system permissions from profiles and permission sets...');

  try {
    const response = await chrome.tabs.sendMessage(state.sourceTabId, {
      type: 'sfsa:runSystemPermissionsAudit',
      payload: { orgContext: state.orgContext }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'System permissions audit failed.');
    }

    renderSystemPermissions(response.data);
    setActiveView('permissions');
    setStatus('System permissions complete', `Loaded ${response.data.summary.totalRows} permission rows at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`);
  } catch (error) {
    setStatus('System permissions failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function handleRunObjectAccess() {
  if (!state.sourceTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running object access.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Running object access', 'Collecting object-level access across profiles, permission sets, and permission set groups...');

  try {
    const response = await chrome.tabs.sendMessage(state.sourceTabId, {
      type: 'sfsa:runObjectAccessAudit',
      payload: { orgContext: state.orgContext }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Object access audit failed.');
    }

    renderObjectAccess(response.data);
    setActiveView('object-access');
    setStatus('Object access complete', `Loaded ${response.data.summary.totalRows} object-access rows at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`);
  } catch (error) {
    setStatus('Object access failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function handleRunMetadataInventory() {
  if (!state.sourceTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running metadata inventory.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Running metadata inventory', 'Inspecting metadata types and member counts using the shared Salesforce helper scripts...');

  try {
    const response = await chrome.tabs.sendMessage(state.sourceTabId, {
      type: 'sfsa:runMetadataInventoryAudit',
      payload: { orgContext: state.orgContext }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Metadata inventory failed.');
    }

    renderMetadataInventory(response.data);
    setActiveView('metadata');
    setStatus('Metadata inventory complete', `Loaded ${response.data.summary.metadataTypes} metadata types at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`);
  } catch (error) {
    setStatus('Metadata inventory failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function renderOrgContext(orgContext) {
  elements.orgName.textContent = orgContext.pageTitle || 'Salesforce Org';
  elements.orgInstance.textContent = orgContext.instance || '-';
  elements.apiVersion.textContent = orgContext.apiVersion || '-';
  elements.uiType.textContent = orgContext.uiType || '-';
}

function renderAuditResult(result) {
  elements.orgName.textContent = result.overview.orgName;
  elements.orgInstance.textContent = result.overview.instance;
  elements.apiVersion.textContent = result.overview.apiVersion;
  elements.securityScore.textContent = String(result.risk.score);
  elements.activeUsers.textContent = String(result.overview.activeUsers);
  elements.profileCount.textContent = String(result.overview.profileCount);
  elements.permissionSetCount.textContent = String(result.overview.permissionSetCount);
  elements.uiType.textContent = result.orgContext.uiType || '-';
  elements.orgType.textContent = result.overview.orgType || '-';
  elements.findingCount.textContent = String(result.risk.findings.length);

  if (!result.risk.findings.length) {
    elements.findingsList.innerHTML = '<li class="empty-state">No initial high-signal findings detected.</li>';
    return;
  }

  elements.findingsList.innerHTML = result.risk.findings.map((finding) => `
    <li class="finding-item is-${finding.severity}">
      <h3 class="finding-title">${escapeHtml(finding.title)}</h3>
      <p class="finding-meta">${escapeHtml(finding.category)} • ${escapeHtml(finding.severity.toUpperCase())}</p>
      <p class="finding-body">${escapeHtml(finding.recommendation)}</p>
    </li>
  `).join('');
}

function renderProfileInventory(result) {
  elements.profilesTotal.textContent = String(result.summary.totalProfiles);
  elements.profilesCustom.textContent = String(result.summary.customProfiles);
  elements.profilesApiEnabled.textContent = String(result.summary.apiEnabledProfiles);
  elements.profilesHighRisk.textContent = String(result.summary.highRiskProfiles);
  elements.profileRowCount.textContent = String(result.rows.length);

  if (!result.rows.length) {
    elements.profileTableBody.innerHTML = '<tr><td colspan="10" class="empty-state table-empty-state">No profiles returned by the current audit query.</td></tr>';
    return;
  }

  elements.profileTableBody.innerHTML = result.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.profileName)}</td>
      <td>${row.userCount}</td>
      <td>${escapeHtml(row.licenseType)}</td>
      <td>${escapeHtml(row.profileType)}</td>
      <td>${renderFlag(row.apiEnabled)}</td>
      <td>${renderFlag(row.modifyAllData)}</td>
      <td>${renderFlag(row.viewAllData)}</td>
      <td>${renderFlag(row.customizeApplication)}</td>
      <td>${renderFlag(row.manageUsers)}</td>
      <td><span class="severity-pill is-${row.severity}">${escapeHtml(row.severity.toUpperCase())}</span></td>
    </tr>
  `).join('');
}

function renderSystemPermissions(result) {
  elements.permissionsTotalRows.textContent = String(result.summary.totalRows);
  elements.permissionsPrincipals.textContent = String(result.summary.principalCount);
  elements.permissionsHighRisk.textContent = String(result.summary.highRiskRows);
  elements.permissionsMediumRisk.textContent = String(result.summary.mediumRiskRows);
  elements.permissionsRowCount.textContent = String(result.rows.length);

  if (!result.rows.length) {
    elements.permissionsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state table-empty-state">No system permissions returned by the current audit query.</td></tr>';
    return;
  }

  elements.permissionsTableBody.innerHTML = result.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.principalType)}</td>
      <td>${escapeHtml(row.principalName)}</td>
      <td>${escapeHtml(row.permissionLabel)}</td>
      <td><span class="severity-pill is-${row.severity}">${escapeHtml(row.severity.toUpperCase())}</span></td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.recommendation)}</td>
    </tr>
  `).join('');
}

function renderObjectAccess(result) {
  elements.objectAccessTotalRows.textContent = String(result.summary.totalRows);
  elements.objectAccessProfileRows.textContent = String(result.summary.profileRows);
  elements.objectAccessPermissionSetRows.textContent = String(result.summary.permissionSetRows + result.summary.permissionSetGroupRows);
  elements.objectAccessHighRisk.textContent = String(result.summary.highRiskRows);
  elements.objectAccessRowCount.textContent = String(result.rows.length);

  if (!result.rows.length) {
    elements.objectAccessTableBody.innerHTML = '<tr><td colspan="11" class="empty-state table-empty-state">No object-access rows returned by the current audit query.</td></tr>';
    return;
  }

  elements.objectAccessTableBody.innerHTML = result.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.principalType)}</td>
      <td>${escapeHtml(row.principalName)}</td>
      <td>${escapeHtml(row.objectName)}</td>
      <td>${escapeHtml(row.objectCategory)}</td>
      <td>${renderFlag(row.read)}</td>
      <td>${renderFlag(row.create)}</td>
      <td>${renderFlag(row.edit)}</td>
      <td>${renderFlag(row.delete)}</td>
      <td>${renderFlag(row.viewAll)}</td>
      <td>${renderFlag(row.modifyAll)}</td>
      <td><span class="severity-pill is-${row.severity}">${escapeHtml(row.severity.toUpperCase())}</span></td>
    </tr>
  `).join('');
}

function renderMetadataInventory(result) {
  elements.metadataTypesCount.textContent = String(result.summary.metadataTypes);
  elements.metadataApexCount.textContent = String(result.summary.apexClasses);
  elements.metadataCustomObjectCount.textContent = String(result.summary.customObjects);
  elements.metadataPermissionSetCount.textContent = String(result.summary.permissionSets);
  elements.metadataRowCount.textContent = String(result.metadataTypes.length);

  if (!result.metadataTypes.length) {
    elements.metadataTableBody.innerHTML = '<tr><td colspan="5" class="empty-state table-empty-state">No metadata types returned by the current audit query.</td></tr>';
    return;
  }

  elements.metadataTableBody.innerHTML = result.metadataTypes.map((item) => `
    <tr>
      <td>${escapeHtml(item.xmlName)}</td>
      <td>${escapeHtml(item.directoryName)}</td>
      <td>${escapeHtml(item.suffix || '-')}</td>
      <td>${renderFlag(item.inFolder)}</td>
      <td>${renderFlag(item.metaFile)}</td>
    </tr>
  `).join('');
}

function updateSourcePanel(tabId, sourceUrl) {
  elements.sourceTabId.textContent = tabId ? String(tabId) : '-';
  elements.sourceOrigin.textContent = sourceUrl ? safeOrigin(sourceUrl) : '-';
}

function setStatus(title, message, tone = 'success') {
  elements.connectionStatus.textContent = title;
  elements.connectionStatus.classList.toggle('is-error', tone === 'error');
  elements.connectionStatus.classList.toggle('is-warning', tone === 'warning');
  elements.statusMessage.textContent = message;
}

function setBusy(isBusy) {
  elements.detectButton.disabled = isBusy;
  elements.runButton.disabled = isBusy || !state.orgContext;
  elements.runProfileInventoryButton.disabled = isBusy || !state.orgContext;
  elements.runSystemPermissionsButton.disabled = isBusy || !state.orgContext;
  elements.runObjectAccessButton.disabled = isBusy || !state.orgContext;
  elements.runMetadataInventoryButton.disabled = isBusy || !state.orgContext;
  elements.useCurrentTabButton.disabled = isBusy;
}

function setActiveView(viewName) {
  state.activeView = viewName;
  const isOverview = viewName === 'overview';
  const isProfiles = viewName === 'profiles';
  const isPermissions = viewName === 'permissions';
  const isObjectAccess = viewName === 'object-access';
  const isMetadata = viewName === 'metadata';

  elements.navOverview.classList.toggle('is-active', isOverview);
  elements.navProfiles.classList.toggle('is-active', isProfiles);
  elements.navPermissions.classList.toggle('is-active', isPermissions);
  elements.navObjectAccess.classList.toggle('is-active', isObjectAccess);
  elements.navMetadata.classList.toggle('is-active', isMetadata);
  elements.overviewView.classList.toggle('is-active', isOverview);
  elements.profilesView.classList.toggle('is-active', isProfiles);
  elements.permissionsView.classList.toggle('is-active', isPermissions);
  elements.objectAccessView.classList.toggle('is-active', isObjectAccess);
  elements.metadataView.classList.toggle('is-active', isMetadata);
}

function isSupportedSalesforceUrl(url) {
  return [
    /https:\/\/.*\.salesforce\.com\//i,
    /https:\/\/.*\.lightning\.force\.com\//i,
    /https:\/\/.*\.my\.salesforce\.com\//i,
    /https:\/\/.*\.visual\.force\.com\//i,
    /https:\/\/.*\.salesforce-setup\.com\//i,
    /https:\/\/.*\.my\.salesforce-setup\.com\//i,
    /https:\/\/login\.salesforce\.com\//i,
    /https:\/\/test\.salesforce\.com\//i
  ].some((pattern) => pattern.test(url));
}

function isExtensionPage(url) {
  return url.startsWith(chrome.runtime.getURL(''));
}

function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFlag(value) {
  return `<span class="boolean-pill ${value ? 'is-true' : 'is-false'}">${value ? 'Yes' : 'No'}</span>`;
}