const state = {
  activeTabId: null,
  orgContext: null
};

const elements = {
  detectButton: document.querySelector('#detect-org-button'),
  runButton: document.querySelector('#run-audit-button'),
  connectionStatus: document.querySelector('#connection-status'),
  statusMessage: document.querySelector('#status-message'),
  orgName: document.querySelector('#org-name'),
  orgInstance: document.querySelector('#org-instance'),
  apiVersion: document.querySelector('#api-version'),
  securityScore: document.querySelector('#security-score'),
  activeUsers: document.querySelector('#active-users'),
  profileCount: document.querySelector('#profile-count'),
  permissionSetCount: document.querySelector('#permission-set-count'),
  uiType: document.querySelector('#ui-type'),
  findingCount: document.querySelector('#finding-count'),
  findingsList: document.querySelector('#findings-list')
};

initialize();

async function initialize() {
  elements.detectButton.addEventListener('click', handleDetectOrg);
  elements.runButton.addEventListener('click', handleRunAudit);

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.activeTabId = activeTab?.id || null;

  if (!activeTab?.url || !isSalesforceUrl(activeTab.url)) {
    setStatus('Waiting for Salesforce tab', 'Open a logged-in Salesforce tab to start the audit.', 'warning');
    elements.runButton.disabled = true;
    return;
  }

  await handleDetectOrg();
}

async function handleDetectOrg() {
  if (!state.activeTabId) {
    setStatus('No active tab', 'Could not resolve an active browser tab.', 'error');
    return;
  }

  setBusy(true);
  setStatus('Detecting org', 'Reading org context from the active Salesforce tab...');

  try {
    const response = await chrome.tabs.sendMessage(state.activeTabId, { type: 'sfsa:getOrgContext' });

    if (!response?.ok) {
      throw new Error(response?.error || 'Could not read org context.');
    }

    state.orgContext = response.data;
    elements.runButton.disabled = false;

    elements.orgName.textContent = state.orgContext.pageTitle || 'Salesforce Org';
    elements.orgInstance.textContent = state.orgContext.instance || '-';
    elements.apiVersion.textContent = state.orgContext.apiVersion || '-';
    elements.uiType.textContent = state.orgContext.uiType || '-';

    setStatus('Connected', `Detected ${state.orgContext.orgUrl} using ${state.orgContext.connectionMode}.`);
  } catch (error) {
    setStatus('Connection failed', error.message, 'error');
    elements.runButton.disabled = true;
  } finally {
    setBusy(false);
  }
}

async function handleRunAudit() {
  if (!state.activeTabId || !state.orgContext) {
    setStatus('Not ready', 'Detect the active Salesforce org before running the audit.', 'warning');
    return;
  }

  setBusy(true);
  setStatus('Running overview audit', 'Collecting org overview metrics from the active Salesforce tab...');

  try {
    const response = await chrome.tabs.sendMessage(state.activeTabId, {
      type: 'sfsa:runOverviewAudit',
      payload: { orgContext: state.orgContext }
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Overview audit failed.');
    }

    renderAuditResult(response.data);
    setStatus('Audit complete', `Overview audit generated at ${new Date(response.data.generatedAt).toLocaleTimeString()}.`);
  } catch (error) {
    setStatus('Audit failed', error.message, 'error');
  } finally {
    setBusy(false);
  }
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
  elements.findingCount.textContent = String(result.risk.findings.length);

  if (!result.risk.findings.length) {
    elements.findingsList.innerHTML = '<li class="empty-state">No initial high-signal findings detected.</li>';
    return;
  }

  elements.findingsList.innerHTML = result.risk.findings.map((finding) => `
    <li class="finding-item is-${finding.severity}">
      <strong>${escapeHtml(finding.title)}</strong>
      <p class="finding-meta">${escapeHtml(finding.category)} • ${escapeHtml(finding.severity.toUpperCase())}</p>
      <p>${escapeHtml(finding.recommendation)}</p>
    </li>
  `).join('');
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
}

function isSalesforceUrl(url) {
  return /https:\/\/.*\.(salesforce|force)\.com\//i.test(url);
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