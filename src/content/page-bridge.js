import { OrgDetector } from '../salesforce-scripts/org-detector.js';

(async function bootstrapPageBridge() {
  const EVENT_NAME = 'sfsa:page-context';

  try {
    const detector = new OrgDetector();
    const orgInfo = await detector.detectOrg();

    const detail = {
      orgUrl: orgInfo.url,
      hostname: window.location.hostname,
      instance: orgInfo.instance,
      orgId: orgInfo.orgId,
      apiVersion: orgInfo.apiVersion,
      uiType: detector.detectUIType(),
      pageTitle: document.title,
      connectionMode: 'page-detector'
    };

    document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  } catch (error) {
    document.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: {
        orgUrl: window.location.origin,
        hostname: window.location.hostname,
        instance: window.location.hostname.split('.')[0],
        orgId: null,
        apiVersion: '60.0',
        uiType: window.location.href.includes('/lightning/') ? 'lightning' : 'classic',
        pageTitle: document.title,
        connectionMode: 'fallback-detector',
        detectionError: error.message
      }
    }));
  }
})();