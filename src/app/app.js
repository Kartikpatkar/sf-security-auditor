const defaultConfig = {
  app_title: 'SF Security Auditor',
  tagline: 'Privacy-first Salesforce audit workspace. All analysis runs locally in your browser.',
  background_color: '#0f1419',
  surface_color: '#1a2027',
  text_color: '#e8edf2',
  accent_color: '#22c993',
  muted_color: '#7a8b99',
  font_family: 'DM Sans',
  font_size: 14
};

const state = {
  sourceTabId: null,
  orgContext: null,
  activeView: 'overview',
  theme: 'dark',
  profileView: {
    search: '',
    severity: 'all',
    enrichment: 'all',
    sort: 'severity-desc'
  },
  results: {
    overview: null,
    profiles: null,
    permissions: null,
    objectAccess: null,
    metadata: null
  }
};

const elements = {
  detectButton: document.querySelector('#detect-org-button'),
  runButton: document.querySelector('#run-audit-button'),
  runProfileInventoryButton: document.querySelector('#run-profile-inventory-button'),
  refreshProfileMetadataButton: document.querySelector('#refresh-profile-metadata-button'),
  runSystemPermissionsButton: document.querySelector('#run-system-permissions-button'),
  runObjectAccessButton: document.querySelector('#run-object-access-button'),
  runMetadataInventoryButton: document.querySelector('#run-metadata-inventory-button'),
  refreshMetadataInventoryButton: document.querySelector('#refresh-metadata-inventory-button'),
  exportWorkbookButton: document.querySelector('#export-workbook-button'),
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
  overviewLastRun: document.querySelector('#overview-last-run'),
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
  profilesEnrichmentSource: document.querySelector('#profiles-enrichment-source'),
  profilesHighRisk: document.querySelector('#profiles-high-risk'),
  profilesEnrichmentStatus: document.querySelector('#profiles-enrichment-status'),
  profilesLastRun: document.querySelector('#profiles-last-run'),
  profileSearchInput: document.querySelector('#profile-search-input'),
  profileSeverityFilter: document.querySelector('#profile-severity-filter'),
  profileEnrichmentFilter: document.querySelector('#profile-enrichment-filter'),
  profileSortSelect: document.querySelector('#profile-sort-select'),
  profileRowCount: document.querySelector('#profile-row-count'),
  profileTableBody: document.querySelector('#profile-table-body'),
  permissionsTotalRows: document.querySelector('#permissions-total-rows'),
  permissionsPrincipals: document.querySelector('#permissions-principals'),
  permissionsHighRisk: document.querySelector('#permissions-high-risk'),
  permissionsMediumRisk: document.querySelector('#permissions-medium-risk'),
  permissionsLastRun: document.querySelector('#permissions-last-run'),
  permissionsRowCount: document.querySelector('#permissions-row-count'),
  permissionsTableBody: document.querySelector('#permissions-table-body'),
  objectAccessTotalRows: document.querySelector('#object-access-total-rows'),
  objectAccessProfileRows: document.querySelector('#object-access-profile-rows'),
  objectAccessPermissionSetRows: document.querySelector('#object-access-permission-set-rows'),
  objectAccessHighRisk: document.querySelector('#object-access-high-risk'),
  objectAccessLastRun: document.querySelector('#object-access-last-run'),
  objectAccessRowCount: document.querySelector('#object-access-row-count'),
  objectAccessTableBody: document.querySelector('#object-access-table-body'),
  metadataTypesCount: document.querySelector('#metadata-types-count'),
  metadataApexCount: document.querySelector('#metadata-apex-count'),
  metadataCustomObjectCount: document.querySelector('#metadata-custom-object-count'),
  metadataSource: document.querySelector('#metadata-source'),
  metadataInventoryStatus: document.querySelector('#metadata-inventory-status'),
  metadataLastRun: document.querySelector('#metadata-last-run'),
  metadataRowCount: document.querySelector('#metadata-row-count'),
  metadataTableBody: document.querySelector('#metadata-table-body'),
  exportStatus: document.querySelector('#export-status'),
  themeToggleButton: document.querySelector('#theme-toggle-button')
};

initialize();

async function initialize() {
  // Apply visual config
  applyConfig(defaultConfig);

  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  elements.detectButton.addEventListener('click', handleDetectOrg);
  elements.runButton.addEventListener('click', handleRunAudit);
  elements.runProfileInventoryButton.addEventListener('click', handleRunProfileInventory);
  elements.refreshProfileMetadataButton.addEventListener('click', handleRefreshProfileMetadata);
  elements.profileSearchInput.addEventListener('input', handleProfileViewChange);
  elements.profileSeverityFilter.addEventListener('change', handleProfileViewChange);
  elements.profileEnrichmentFilter.addEventListener('change', handleProfileViewChange);
  elements.profileSortSelect.addEventListener('change', handleProfileViewChange);
  elements.runSystemPermissionsButton.addEventListener('click', handleRunSystemPermissions);
  elements.runObjectAccessButton.addEventListener('click', handleRunObjectAccess);
  elements.runMetadataInventoryButton.addEventListener('click', handleRunMetadataInventory);
  elements.refreshMetadataInventoryButton.addEventListener('click', handleRefreshMetadataInventory);
  elements.exportWorkbookButton.addEventListener('click', handleExportWorkbook);
  elements.useCurrentTabButton.addEventListener('click', handleUseCurrentTab);
  if (elements.themeToggleButton) {
    elements.themeToggleButton.addEventListener('click', handleToggleTheme);
  }

  // Load saved theme preference
  const savedTheme = localStorage.getItem('sfsa-theme') || 'dark';
  const appShell = document.querySelector('.app-shell');
  if (savedTheme === 'light' && appShell) {
    appShell.classList.add('light-theme');
    state.theme = 'light';
  } else {
    state.theme = 'dark';
  }
  elements.navOverview.addEventListener('click', () => setActiveView('overview'));
  elements.navProfiles.addEventListener('click', () => setActiveView('profiles'));
  elements.navPermissions.addEventListener('click', () => setActiveView('permissions'));
  elements.navObjectAccess.addEventListener('click', () => setActiveView('object-access'));
  elements.navMetadata.addEventListener('click', () => setActiveView('metadata'));

  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'sfsa:getLaunchContext' });
      const launchContext = response?.ok ? response.data : null;

      setActiveView('overview');
      updateExportAvailability();

      if (launchContext?.sourceTabId) {
        state.sourceTabId = launchContext.sourceTabId;
        updateSourcePanel(launchContext.sourceTabId, launchContext.sourceUrl);
        await handleDetectOrg();
        return;
      }
    } catch (e) {
      console.warn('[SFSA] Failed to get launch context:', e);
    }
  } else {
    setActiveView('overview');
    updateExportAvailability();
  }

  setStatus('No Salesforce source tab', 'Open the app from a Salesforce tab, or use the reconnect action below.', 'warning');
  elements.runButton.disabled = true;

  // Load preview SDK dynamically if in preview environment (not extension context)
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    loadScript('/_sdk/element_sdk.js', () => {
      if (window.elementSdk) {
        window.elementSdk.init({
          defaultConfig,
          onConfigChange: async (config) => applyConfig(config),
          mapToCapabilities: (config) => ({
            recolorables: [
              { get: () => config.background_color || defaultConfig.background_color, set: (v) => { config.background_color = v; window.elementSdk.setConfig({ background_color: v }); } },
              { get: () => config.surface_color || defaultConfig.surface_color, set: (v) => { config.surface_color = v; window.elementSdk.setConfig({ surface_color: v }); } },
              { get: () => config.text_color || defaultConfig.text_color, set: (v) => { config.text_color = v; window.elementSdk.setConfig({ text_color: v }); } },
              { get: () => config.accent_color || defaultConfig.accent_color, set: (v) => { config.accent_color = v; window.elementSdk.setConfig({ accent_color: v }); } },
              { get: () => config.muted_color || defaultConfig.muted_color, set: (v) => { config.muted_color = v; window.elementSdk.setConfig({ muted_color: v }); } },
            ],
            borderables: [],
            fontEditable: { get: () => config.font_family || defaultConfig.font_family, set: (v) => { config.font_family = v; window.elementSdk.setConfig({ font_family: v }); } },
            fontSizeable: { get: () => config.font_size || defaultConfig.font_size, set: (v) => { config.font_size = v; window.elementSdk.setConfig({ font_size: v }); } },
          }),
          mapToEditPanelValues: (config) => new Map([
            ['app_title', config.app_title || defaultConfig.app_title],
            ['tagline', config.tagline || defaultConfig.tagline],
          ])
        });
      }
    });
    loadScript('/_sdk/data_sdk.js');
    loadScript('/_sdk/telemetry_sdk.js');
  }
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
    const response = await sendTabRuntimeMessage(state.sourceTabId, { type: 'sfsa:getOrgContext' });

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
    const response = await sendTabRuntimeMessage(state.sourceTabId, {
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
  return handleRunProfileInventoryAudit({ forceMetadataRefresh: false });
}

async function handleRefreshProfileMetadata() {
  return handleRunProfileInventoryAudit({ forceMetadataRefresh: true });
}

async function handleRunProfileInventoryAudit(options = {}) {
  if (!state.sourceTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running profile inventory.', 'warning');
    return;
  }

  const forceMetadataRefresh = Boolean(options.forceMetadataRefresh);
  setBusy(true);
  setStatus(
    forceMetadataRefresh ? 'Refreshing profile metadata' : 'Running profile inventory',
    forceMetadataRefresh
      ? 'Bypassing cached profile metadata and retrieving a fresh metadata snapshot from the linked Salesforce tab...'
      : 'Collecting profile-level access and active-user counts from the linked Salesforce tab...'
  );

  try {
    const response = await sendTabRuntimeMessage(state.sourceTabId, {
      type: 'sfsa:runProfileInventoryAudit',
      payload: {
        orgContext: state.orgContext,
        forceMetadataRefresh
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Profile inventory failed.');
    }

    renderProfileInventory(response.data);
    setActiveView('profiles');
    setStatus(
      forceMetadataRefresh ? 'Profile metadata refreshed' : 'Profile inventory complete',
      `Loaded ${response.data.summary.totalProfiles} profiles at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`
    );
  } catch (error) {
    setStatus(forceMetadataRefresh ? 'Profile metadata refresh failed' : 'Profile inventory failed', error.message, 'error');
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
    const response = await sendTabRuntimeMessage(state.sourceTabId, {
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
    const response = await sendTabRuntimeMessage(state.sourceTabId, {
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
  return handleRunMetadataInventoryAudit({ forceMetadataRefresh: false });
}

async function handleRefreshMetadataInventory() {
  return handleRunMetadataInventoryAudit({ forceMetadataRefresh: true });
}

async function handleRunMetadataInventoryAudit(options = {}) {
  if (!state.sourceTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running metadata inventory.', 'warning');
    return;
  }

  const forceMetadataRefresh = Boolean(options.forceMetadataRefresh);
  setBusy(true);
  setStatus(
    forceMetadataRefresh ? 'Refreshing metadata inventory' : 'Running metadata inventory',
    forceMetadataRefresh
      ? 'Bypassing cached metadata inventory and retrieving a fresh snapshot using the shared Salesforce helper scripts...'
      : 'Inspecting metadata types and member counts using the shared Salesforce helper scripts...'
  );

  try {
    const response = await sendTabRuntimeMessage(state.sourceTabId, {
      type: 'sfsa:runMetadataInventoryAudit',
      payload: {
        orgContext: state.orgContext,
        forceMetadataRefresh
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Metadata inventory failed.');
    }

    renderMetadataInventory(response.data);
    setActiveView('metadata');
    setStatus(
      forceMetadataRefresh ? 'Metadata inventory refreshed' : 'Metadata inventory complete',
      `Loaded ${response.data.summary.metadataTypes} metadata types at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`
    );
  } catch (error) {
    setStatus(forceMetadataRefresh ? 'Metadata inventory refresh failed' : 'Metadata inventory failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function renderOrgContext(orgContext) {
  elements.orgName.textContent = orgContext.pageTitle || 'Salesforce Org';
  elements.orgInstance.textContent = orgContext.instance || '-';
  elements.apiVersion.textContent = orgContext.apiVersion || '-';
  if (elements.uiType) {
    elements.uiType.textContent = orgContext.uiType || '-';
  }
}

function renderAuditResult(result) {
  state.results.overview = result;
  elements.overviewLastRun.textContent = `Overview last updated ${formatGeneratedAt(result.generatedAt)}.`;
  elements.orgName.textContent = result.overview.orgName;
  elements.orgInstance.textContent = result.overview.instance;
  elements.apiVersion.textContent = result.overview.apiVersion;
  elements.securityScore.textContent = String(result.risk.score);
  elements.activeUsers.textContent = String(result.overview.activeUsers);
  elements.profileCount.textContent = String(result.overview.profileCount);
  elements.permissionSetCount.textContent = String(result.overview.permissionSetCount);
  if (elements.uiType) {
    elements.uiType.textContent = result.orgContext.uiType || '-';
  }
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

  updateExportAvailability();
}

function renderProfileInventory(result) {
  state.results.profiles = result;
  elements.profilesLastRun.textContent = `Profile inventory last updated ${formatGeneratedAt(result.generatedAt)}.`;
  elements.profilesTotal.textContent = String(result.summary.totalProfiles);
  elements.profilesCustom.textContent = String(result.summary.customProfiles);
  elements.profilesEnrichmentSource.textContent = summarizeMetadataSource(result.summary.enrichmentSource);
  elements.profilesHighRisk.textContent = String(result.summary.highRiskProfiles);
  elements.profilesEnrichmentStatus.textContent = buildProfileEnrichmentStatus(result.summary);
  syncProfileControls();
  renderProfileInventoryRows();

  updateExportAvailability();
}

function renderProfileInventoryRows() {
  const result = state.results.profiles;

  if (!result?.rows?.length) {
    elements.profileRowCount.textContent = '0';
    elements.profileTableBody.innerHTML = '<tr><td colspan="15" class="empty-state table-empty-state">No profiles returned by the current audit query.</td></tr>';
    return;
  }

  const rows = applyProfileView(result.rows, state.profileView);
  elements.profileRowCount.textContent = rows.length === result.rows.length ? String(rows.length) : `${rows.length}/${result.rows.length}`;

  if (!rows.length) {
    elements.profileTableBody.innerHTML = '<tr><td colspan="15" class="empty-state table-empty-state">No profiles match the current filter and sort settings.</td></tr>';
    return;
  }

  elements.profileTableBody.innerHTML = rows.map((row) => `
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
      <td>${renderFlag(row.runReports)}</td>
      <td>${renderFlag(row.exportReport)}</td>
      <td>${escapeHtml(row.mfaStatus)}</td>
      <td>${escapeHtml(row.sessionRestrictions)}</td>
      <td>${escapeHtml(row.loginIpRestrictions)}</td>
      <td><span class="severity-pill is-${row.severity}">${escapeHtml(row.severity.toUpperCase())}</span></td>
    </tr>
  `).join('');
}

function handleProfileViewChange() {
  state.profileView.search = elements.profileSearchInput.value.trim();
  state.profileView.severity = elements.profileSeverityFilter.value;
  state.profileView.enrichment = elements.profileEnrichmentFilter.value;
  state.profileView.sort = elements.profileSortSelect.value;

  if (state.results.profiles) {
    renderProfileInventoryRows();
  }
}

function syncProfileControls() {
  elements.profileSearchInput.value = state.profileView.search;
  elements.profileSeverityFilter.value = state.profileView.severity;
  elements.profileEnrichmentFilter.value = state.profileView.enrichment;
  elements.profileSortSelect.value = state.profileView.sort;
}

function applyProfileView(rows, view) {
  const search = view.search.trim().toLowerCase();

  return rows
    .filter((row) => {
      if (view.severity !== 'all' && row.severity !== view.severity) {
        return false;
      }

      const isEnriched = row.mfaStatus !== 'Unavailable' || row.sessionRestrictions !== 'Unavailable' || row.loginIpRestrictions !== 'Unavailable';
      if (view.enrichment === 'enriched' && !isEnriched) {
        return false;
      }

      if (view.enrichment === 'missing' && isEnriched) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        row.profileName,
        row.licenseType,
        row.profileType,
        row.mfaStatus,
        row.sessionRestrictions,
        row.loginIpRestrictions,
        row.severity
      ].some((value) => String(value || '').toLowerCase().includes(search));
    })
    .sort((left, right) => compareProfileRows(left, right, view.sort));
}

function compareProfileRows(left, right, sortKey) {
  if (sortKey === 'users-desc') {
    return right.userCount - left.userCount || left.profileName.localeCompare(right.profileName);
  }

  if (sortKey === 'users-asc') {
    return left.userCount - right.userCount || left.profileName.localeCompare(right.profileName);
  }

  if (sortKey === 'name-desc') {
    return right.profileName.localeCompare(left.profileName);
  }

  if (sortKey === 'name-asc') {
    return left.profileName.localeCompare(right.profileName);
  }

  if (sortKey === 'license-asc') {
    return left.licenseType.localeCompare(right.licenseType) || left.profileName.localeCompare(right.profileName);
  }

  return severityRank(right.severity) - severityRank(left.severity) || right.userCount - left.userCount || left.profileName.localeCompare(right.profileName);
}

function severityRank(value) {
  if (value === 'high') {
    return 3;
  }

  if (value === 'medium') {
    return 2;
  }

  if (value === 'low') {
    return 1;
  }

  return 0;
}

function buildProfileEnrichmentStatus(summary) {
  const enriched = summary.metadataEnrichedProfiles || 0;
  const source = summary.enrichmentSource || 'unknown';
  const message = summary.enrichmentMessage || 'No metadata enrichment details available.';

  if (source === 'fallback') {
    return `Metadata enrichment unavailable. ${message}`;
  }

  if (source === 'metadata-cache') {
    return `Metadata enrichment applied to ${enriched} profiles from cache. ${message}`;
  }

  if (source === 'metadata-retrieve') {
    return `Metadata enrichment applied to ${enriched} profiles from a fresh metadata retrieve. ${message}`;
  }

  return `Metadata enrichment status: ${message}`;
}

function buildMetadataInventoryStatus(summary) {
  const source = summary.inventorySource || 'unknown';
  const message = summary.inventoryMessage || 'No metadata inventory details available.';

  if (source === 'metadata-cache') {
    return `Metadata inventory loaded from cache. ${message}`;
  }

  if (source === 'metadata-retrieve') {
    return `Metadata inventory loaded from a fresh retrieve. ${message}`;
  }

  if (source === 'fallback') {
    return `Metadata inventory unavailable. ${message}`;
  }

  return `Metadata inventory status: ${message}`;
}

function summarizeMetadataSource(source) {
  if (source === 'metadata-cache') {
    return 'Cache';
  }

  if (source === 'metadata-retrieve') {
    return 'Fresh';
  }

  if (source === 'fallback') {
    return 'Fallback';
  }

  if (source === 'empty') {
    return 'Empty';
  }

  return 'Unknown';
}

function formatGeneratedAt(value) {
  if (!value) {
    return 'at an unknown time';
  }

  return new Date(value).toLocaleTimeString();
}

function renderSystemPermissions(result) {
  state.results.permissions = result;
  elements.permissionsLastRun.textContent = `System permissions last updated ${formatGeneratedAt(result.generatedAt)}.`;
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

  updateExportAvailability();
}

function renderObjectAccess(result) {
  state.results.objectAccess = result;
  elements.objectAccessLastRun.textContent = `Object access last updated ${formatGeneratedAt(result.generatedAt)}.`;
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

  updateExportAvailability();
}

function renderMetadataInventory(result) {
  state.results.metadata = result;
  elements.metadataLastRun.textContent = `Metadata inventory last updated ${formatGeneratedAt(result.generatedAt)}.`;
  elements.metadataTypesCount.textContent = String(result.summary.metadataTypes);
  elements.metadataApexCount.textContent = String(result.summary.apexClasses);
  elements.metadataCustomObjectCount.textContent = String(result.summary.customObjects);
  elements.metadataSource.textContent = summarizeMetadataSource(result.summary.inventorySource);
  elements.metadataInventoryStatus.textContent = buildMetadataInventoryStatus(result.summary);
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

  updateExportAvailability();
}

async function handleExportWorkbook() {
  if (!hasExportableResults()) {
    setStatus('Nothing to export', 'Run at least one audit module before exporting the workbook.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Exporting workbook', 'Preparing a styled Excel workbook from the loaded audit results...');

  try {
    const workbook = buildAuditWorkbook();
    const buffer = await workbook.xlsx.writeBuffer();
    await downloadWorkbook(buildWorkbookFilename(), buffer);

    elements.exportStatus.textContent = 'Workbook exported to your downloads folder.';
    setStatus('Export complete', 'Downloaded the audit workbook from the currently loaded audit modules.');
  } catch (error) {
    setStatus('Export failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function updateSourcePanel(tabId, sourceUrl) {
  if (elements.sourceTabId) {
    elements.sourceTabId.textContent = tabId ? String(tabId) : '-';
  }
  if (elements.sourceOrigin) {
    elements.sourceOrigin.textContent = sourceUrl ? safeOrigin(sourceUrl) : '-';
  }
}

function handleToggleTheme() {
  const appShell = document.querySelector('.app-shell');
  if (!appShell) return;
  if (appShell.classList.contains('light-theme')) {
    appShell.classList.remove('light-theme');
    localStorage.setItem('sfsa-theme', 'dark');
    state.theme = 'dark';
  } else {
    appShell.classList.add('light-theme');
    localStorage.setItem('sfsa-theme', 'light');
    state.theme = 'light';
  }
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
  elements.refreshProfileMetadataButton.disabled = isBusy || !state.orgContext;
  elements.runSystemPermissionsButton.disabled = isBusy || !state.orgContext;
  elements.runObjectAccessButton.disabled = isBusy || !state.orgContext;
  elements.runMetadataInventoryButton.disabled = isBusy || !state.orgContext;
  elements.refreshMetadataInventoryButton.disabled = isBusy || !state.orgContext;
  elements.exportWorkbookButton.disabled = isBusy || !hasExportableResults();
  elements.useCurrentTabButton.disabled = isBusy;
}

function setActiveView(viewName) {
  state.activeView = viewName;
  const isOverview = viewName === 'overview';
  const isProfiles = viewName === 'profiles';
  const isPermissions = viewName === 'permissions';
  const isObjectAccess = viewName === 'object-access';
  const isMetadata = viewName === 'metadata';

  elements.navOverview.classList.toggle('active', isOverview);
  elements.navProfiles.classList.toggle('active', isProfiles);
  elements.navPermissions.classList.toggle('active', isPermissions);
  elements.navObjectAccess.classList.toggle('active', isObjectAccess);
  elements.navMetadata.classList.toggle('active', isMetadata);
  elements.overviewView.classList.toggle('active', isOverview);
  elements.profilesView.classList.toggle('active', isProfiles);
  elements.permissionsView.classList.toggle('active', isPermissions);
  elements.objectAccessView.classList.toggle('active', isObjectAccess);
  elements.metadataView.classList.toggle('active', isMetadata);
}

function isSupportedSalesforceUrl(url) {
  return [
    /https:\/\/.*\.salesforce\.com\//i,
    /https:\/\/.*\.lightning\.force\.com\//i,
    /https:\/\/.*\.my\.salesforce\.com\//i,
    /https:\/\/.*\.visual\.force\.com\//i,
    /https:\/\/.*\.force\.com\//i,
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

async function sendTabRuntimeMessage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (isMissingReceiverError(error)) {
      throw new Error('Connection to the Salesforce tab was lost. Please refresh your Salesforce tab and click "Detect Org" to reconnect.');
    }
    throw error;
  }
}

function isMissingReceiverError(error) {
  return /Receiving end does not exist|Could not establish connection/i.test(error?.message || '');
}

function escapeHtml(value) {
  if (value == null) {
    return '';
  }
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFlag(value) {
  return `<span class="boolean-pill ${value ? 'is-true' : 'is-false'}">${value ? 'Yes' : 'No'}</span>`;
}

function updateExportAvailability() {
  const loadedModules = getLoadedModuleNames();

  elements.exportWorkbookButton.disabled = !loadedModules.length;
  elements.exportStatus.textContent = loadedModules.length
    ? `Loaded for export: ${loadedModules.join(', ')}.`
    : 'Run at least one audit module to enable workbook export.';
}

function hasExportableResults() {
  return getLoadedModuleNames().length > 0;
}

function getLoadedModuleNames() {
  return Object.entries(state.results)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

function buildWorkbookFilename() {
  const orgSlug = sanitizeFileName(state.results.overview?.overview.orgName || state.orgContext?.instance || 'salesforce-org');
  const dateStamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `sf-security-auditor/${orgSlug}/${dateStamp}/audit-workbook.xlsx`;
}

async function downloadWorkbook(filename, buffer) {
  const blob = new Blob([
    buffer
  ], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);

  try {
    await chrome.downloads.download({
      url,
      filename,
      conflictAction: 'uniquify',
      saveAs: false
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function buildAuditWorkbook() {
  const workbook = new window.ExcelJS.Workbook();
  workbook.creator = 'SF Security Auditor';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.company = 'SF Security Auditor';

  if (state.results.overview) {
    const overviewSheet = workbook.addWorksheet('Overview');
    const result = state.results.overview;
    const overviewRows = [
      { metric: 'Org Name', value: result.overview.orgName },
      { metric: 'Org Type', value: result.overview.orgType },
      { metric: 'Instance', value: result.overview.instance },
      { metric: 'API Version', value: result.overview.apiVersion },
      { metric: 'Active Users', value: result.overview.activeUsers },
      { metric: 'Profiles', value: result.overview.profileCount },
      { metric: 'Permission Sets', value: result.overview.permissionSetCount },
      { metric: 'Security Score', value: result.risk.score },
      { metric: 'Generated At', value: result.generatedAt }
    ];

    addTableSheet(overviewSheet, {
      title: 'Org Overview',
      columns: [
        { header: 'Metric', key: 'metric', width: 28 },
        { header: 'Value', key: 'value', width: 40 }
      ],
      rows: overviewRows,
      summaryRows: [
        { metric: 'Exported At', value: new Date().toISOString() },
        { metric: 'Module Last Updated', value: result.generatedAt }
      ]
    });

    if (result.risk.findings.length) {
      overviewSheet.addRow([]);
      const findingsStartRow = overviewSheet.lastRow.number + 2;
      overviewSheet.getCell(`A${findingsStartRow}`).value = 'Initial Findings';
      styleSectionTitle(overviewSheet.getCell(`A${findingsStartRow}`));
      addTableAtRow(overviewSheet, findingsStartRow + 1, {
        columns: [
          { header: 'Severity', key: 'severity', width: 14 },
          { header: 'Category', key: 'category', width: 22 },
          { header: 'Title', key: 'title', width: 34 },
          { header: 'Recommendation', key: 'recommendation', width: 60 }
        ],
        rows: result.risk.findings
      });
    }
  }

  if (state.results.profiles) {
    const result = state.results.profiles;
    addTableSheet(workbook.addWorksheet('Profiles & Permission Sets'), {
      title: 'Profile & Permission Set Inventory',
      summaryRows: [
        { metric: 'Module Last Updated', value: result.generatedAt },
        { metric: 'Metadata Source', value: summarizeMetadataSource(result.summary.enrichmentSource) },
        { metric: 'Enrichment Detail', value: result.summary.enrichmentMessage },
        { metric: 'Profiles & Permission Sets Loaded', value: result.summary.totalProfiles },
        { metric: 'Profiles & Permission Sets Enriched', value: result.summary.metadataEnrichedProfiles }
      ],
      columns: [
        { header: 'Profile Name', key: 'profileName', width: 28 },
        { header: 'User Count', key: 'userCount', width: 12 },
        { header: 'License Type', key: 'licenseType', width: 24 },
        { header: 'Profile Type', key: 'profileType', width: 14 },
        { header: 'API Enabled', key: 'apiEnabled', width: 14 },
        { header: 'Modify All Data', key: 'modifyAllData', width: 16 },
        { header: 'View All Data', key: 'viewAllData', width: 16 },
        { header: 'Customize Application', key: 'customizeApplication', width: 20 },
        { header: 'Manage Users', key: 'manageUsers', width: 14 },
        { header: 'Run Reports', key: 'runReports', width: 14 },
        { header: 'Export Reports', key: 'exportReport', width: 16 },
        { header: 'MFA Status', key: 'mfaStatus', width: 24 },
        { header: 'Session Restrictions', key: 'sessionRestrictions', width: 24 },
        { header: 'Login IP Restrictions', key: 'loginIpRestrictions', width: 24 },
        { header: 'Severity', key: 'severity', width: 12 }
      ],
      rows: result.rows
    });
  }

  if (state.results.permissions) {
    const result = state.results.permissions;
    addTableSheet(workbook.addWorksheet('Permissions'), {
      title: 'System Permissions Matrix',
      summaryRows: [
        { metric: 'Module Last Updated', value: result.generatedAt },
        { metric: 'Rows Loaded', value: result.summary.totalRows },
        { metric: 'High Risk Rows', value: result.summary.highRiskRows },
        { metric: 'Principals', value: result.summary.principalCount }
      ],
      columns: [
        { header: 'Principal Type', key: 'principalType', width: 18 },
        { header: 'Principal Name', key: 'principalName', width: 28 },
        { header: 'Permission', key: 'permissionLabel', width: 28 },
        { header: 'Severity', key: 'severity', width: 12 },
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Recommendation', key: 'recommendation', width: 60 }
      ],
      rows: result.rows
    });
  }

  if (state.results.objectAccess) {
    const result = state.results.objectAccess;
    addTableSheet(workbook.addWorksheet('Object Access'), {
      title: 'Object Access Matrix',
      summaryRows: [
        { metric: 'Module Last Updated', value: result.generatedAt },
        { metric: 'Rows Loaded', value: result.summary.totalRows },
        { metric: 'Profile Rows', value: result.summary.profileRows },
        { metric: 'Permission Set Rows', value: result.summary.permissionSetRows },
        { metric: 'Group Rows', value: result.summary.permissionSetGroupRows },
        { metric: 'High Risk Rows', value: result.summary.highRiskRows }
      ],
      columns: [
        { header: 'Principal Type', key: 'principalType', width: 20 },
        { header: 'Principal Name', key: 'principalName', width: 28 },
        { header: 'Object', key: 'objectName', width: 24 },
        { header: 'Category', key: 'objectCategory', width: 18 },
        { header: 'Read', key: 'read', width: 10 },
        { header: 'Create', key: 'create', width: 10 },
        { header: 'Edit', key: 'edit', width: 10 },
        { header: 'Delete', key: 'delete', width: 10 },
        { header: 'View All', key: 'viewAll', width: 12 },
        { header: 'Modify All', key: 'modifyAll', width: 12 },
        { header: 'Severity', key: 'severity', width: 12 }
      ],
      rows: result.rows
    });
  }

  if (state.results.metadata) {
    const result = state.results.metadata;
    addTableSheet(workbook.addWorksheet('Metadata'), {
      title: 'Metadata Inventory',
      summaryRows: [
        { metric: 'Module Last Updated', value: result.generatedAt },
        { metric: 'Metadata Source', value: summarizeMetadataSource(result.summary.inventorySource) },
        { metric: 'Inventory Detail', value: result.summary.inventoryMessage },
        { metric: 'Metadata Types', value: result.summary.metadataTypes },
        { metric: 'Apex Classes', value: result.summary.apexClasses },
        { metric: 'Custom Objects', value: result.summary.customObjects },
        { metric: 'Profiles', value: result.summary.profiles },
        { metric: 'Permission Sets', value: result.summary.permissionSets }
      ],
      columns: [
        { header: 'Metadata Type', key: 'xmlName', width: 26 },
        { header: 'Directory', key: 'directoryName', width: 22 },
        { header: 'Suffix', key: 'suffix', width: 14 },
        { header: 'In Folder', key: 'inFolder', width: 12 },
        { header: 'Meta File', key: 'metaFile', width: 12 }
      ],
      rows: result.metadataTypes
    });
  }

  return workbook;
}

function addTableSheet(worksheet, config) {
  worksheet.properties.defaultRowHeight = 20;
  const summaryRows = config.summaryRows || [];
  const tableStartRow = summaryRows.length ? summaryRows.length + 4 : 2;
  worksheet.views = [{ state: 'frozen', ySplit: tableStartRow }];
  worksheet.getCell('A1').value = config.title;
  styleSectionTitle(worksheet.getCell('A1'));

  if (summaryRows.length) {
    addTableAtRow(worksheet, 2, {
      columns: [
        { header: 'Metric', key: 'metric', width: 28 },
        { header: 'Value', key: 'value', width: 56 }
      ],
      rows: summaryRows
    });
  }

  addTableAtRow(worksheet, tableStartRow, config);
}

function addTableAtRow(worksheet, startRow, config) {
  config.columns.forEach((column, index) => {
    const col = worksheet.getColumn(index + 1);
    if (!col.width || col.width < column.width) {
      col.width = column.width;
    }
  });

  const headerRow = worksheet.getRow(startRow);
  config.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    styleHeaderCell(cell);
  });
  headerRow.height = 22;

  config.rows.forEach((rowData, rowIndex) => {
    const row = worksheet.getRow(startRow + rowIndex + 1);
    config.columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = normalizeWorksheetValue(rowData[column.key]);
      styleBodyCell(cell, column.key);
    });
  });

  worksheet.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow, column: config.columns.length }
  };
}

function sanitizeFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'salesforce-org';
}

function normalizeWorksheetValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return value == null ? '' : value;
}

function styleSectionTitle(cell) {
  cell.font = {
    name: 'Aptos Display',
    size: 16,
    bold: true,
    color: { argb: 'FF123127' }
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDDEBE3' }
  };
}

function styleHeaderCell(cell) {
  cell.font = {
    name: 'Aptos',
    size: 11,
    bold: true,
    color: { argb: 'FFF7FBF5' }
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF123127' }
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: 'center'
  };
  cell.border = buildThinBorder();
}

function styleBodyCell(cell, key) {
  cell.font = {
    name: 'Aptos',
    size: 10,
    color: { argb: 'FF132D26' }
  };
  cell.alignment = {
    vertical: 'top',
    horizontal: isCenteredColumn(key) ? 'center' : 'left',
    wrapText: true
  };
  cell.border = buildThinBorder();

  if (key === 'severity' && typeof cell.value === 'string') {
    const severity = String(cell.value).toLowerCase();
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: severity === 'high' ? 'FFF8D7DA' : severity === 'medium' ? 'FFFDECC8' : 'FFD6EBE4'
      }
    };
  }
}

function buildThinBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFE1E9E4' } },
    left: { style: 'thin', color: { argb: 'FFE1E9E4' } },
    bottom: { style: 'thin', color: { argb: 'FFE1E9E4' } },
    right: { style: 'thin', color: { argb: 'FFE1E9E4' } }
  };
}

function isCenteredColumn(key) {
  return [
    'userCount',
    'apiEnabled',
    'modifyAllData',
    'viewAllData',
    'customizeApplication',
    'manageUsers',
    'runReports',
    'exportReport',
    'severity',
    'read',
    'create',
    'edit',
    'delete',
    'viewAll',
    'modifyAll',
    'inFolder',
    'metaFile'
  ].includes(key);
}



function applyConfig(config) {
  const c = { ...defaultConfig, ...config };
  const appTitle = document.getElementById('app-title');
  if (appTitle) appTitle.textContent = c.app_title;
  const appTagline = document.getElementById('app-tagline');
  if (appTagline) appTagline.textContent = c.tagline;
  document.documentElement.style.setProperty('--cfg-bg', c.background_color);
  document.documentElement.style.setProperty('--cfg-surface', c.surface_color);
  document.documentElement.style.setProperty('--cfg-text', c.text_color);
  document.documentElement.style.setProperty('--cfg-accent', c.accent_color);
  document.documentElement.style.setProperty('--cfg-muted', c.muted_color);
  const appShell = document.querySelector('.app-shell');
  if (appShell) {
    appShell.style.background = c.background_color;
    appShell.style.color = c.text_color;
    appShell.style.fontFamily = `${c.font_family}, sans-serif`;
  }
  const mainScroll = document.querySelector('.main-scroll');
  if (mainScroll) {
    mainScroll.style.fontSize = c.font_size + 'px';
  }
}

function loadScript(src, callback) {
  const script = document.createElement('script');
  script.src = src;
  if (callback) {
    script.onload = callback;
  }
  document.body.appendChild(script);
}