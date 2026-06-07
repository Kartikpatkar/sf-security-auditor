# Chrome Web Store Listing — SF Security Auditor

> Last Updated: 2026-06-07

## Store Listing

**Extension Name**  
SF Security Auditor

**Short Description**  
Privacy-first Salesforce security auditing and compliance reporting toolkit. Run offline queries and audits directly in your browser.

**Detailed Description**  
SF Security Auditor is an enterprise-grade, privacy-first Salesforce security audit workspace that runs entirely within your browser. It connects to your active Salesforce tab to scan security configurations, profiles, permission sets, object access, and system permissions without sending any data to external servers.

**Key Features:**
* Unified Profiles & Permission Sets inventory: Audit user assignments, licenses, and core permissions side-by-side.
* System Permissions Matrix: Scan high-value system permissions (Modify All Data, API Enabled, Author Apex) and review recommendations.
* Object Access Matrix: Visualise CRUD and View All/Modify All settings across standard and custom objects.
* Metadata Snapshot: Inspect metadata types and apex member counts in your org.
* Offline Excel Workbook Export: Generate detailed, fully formatted multi-sheet Excel reports of your loaded audits.
* Full Dark/Light Theme: Persistent styling preference for comfortable workspaces.

**How to Use It:**
1. Log in to your Salesforce target instance in Chrome.
2. Click the SF Security Auditor extension icon to open the full workspace in a new tab.
3. Select "Detect Org" to read credentials and identify the active Salesforce session.
4. Execute individual audit modules (e.g., Profile Inventory, System Permissions) to fetch configuration metrics.
5. Export your results locally as a multi-sheet Excel workbook.

**Privacy & Security:**
All queries and analysis are performed locally inside your browser client. No Salesforce credentials, metadata, or user counts are ever transmitted to any third-party or developer-owned external servers.

**Category**  
Developer Tools

**Single Purpose**  
Executes security, configuration, and compliance audits for the active Salesforce session and exports formatted reports locally.

**Primary Language**  
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `assets/icons/icon-128.png` |
| Screenshot 1 | 1280×800 | ⬜ Not created | `assets/screenshots/overview_dashboard.png` |
| Screenshot 2 | 1280×800 | ⬜ Not created | `assets/screenshots/profile_inventory.png` |
| Screenshot 3 | 1280×800 | ⬜ Not created | `assets/screenshots/system_permissions.png` |
| Screenshot 4 | 1280×800 | ⬜ Not created | `assets/screenshots/export_report_excel.png` |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `cookies` | permissions | Used to fetch the active session token (`sid` cookie) for the matching Salesforce subdomain to execute local query APIs. |
| `downloads` | permissions | Required to download the generated multi-sheet Excel security workbook directly to the user's local Downloads folder. |
| `storage` | permissions | Persists local visual configuration settings and light/dark theme preference across sessions. |
| `https://*.salesforce.com/*` | host_permissions | Allows execution of CORS-compliant SOAP and REST requests to gather security metrics from standard Salesforce instances. |
| `https://*.lightning.force.com/*` | host_permissions | Resolves and connects to Salesforce Lightning UI tabs to execute local query sessions. |
| `https://*.my.salesforce.com/*` | host_permissions | Resolves custom subdomains and Salesforce My Domain instances to initiate secure metadata fetches. |
| `https://*.visual.force.com/*` | host_permissions | Connects to Classic/Visualforce tabs to locate active user session contexts. |
| `https://*.force.com/*` | host_permissions | Enables lookup across general Salesforce Cloud hostnames and developer sandboxes. |
| `https://*.salesforce-setup.com/*` | host_permissions | Connects to Setup subdomains to query org configurations. |
| `https://*.my.salesforce-setup.com/*` | host_permissions | Connects to custom My Domain Setup domains. |
| `https://login.salesforce.com/*` | host_permissions | Allows detecting connection contexts for standard Salesforce production instances. |
| `https://test.salesforce.com/*` | host_permissions | Allows detecting connection contexts for Salesforce sandbox instances. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No  
All data stays on-device and is only processed locally within the sandbox client.

### Data Use Certification
- [x] Data is NOT sold to third parties.
- [x] Data is NOT used for purposes unrelated to the extension's core functionality.
- [x] Data is NOT used for creditworthiness or lending purposes.

---

## Privacy Policy (Draft)

**SF Security Auditor — Privacy Policy**  
*Effective Date: June 7, 2026*  

This Privacy Policy explains how SF Security Auditor ("we", "our", or "the Extension") processes data.

### 1. Data Collection & Sharing
The Extension does not collect, store, or transmit any personally identifiable information, credential tokens, or metadata. All audit requests, configuration checks, and report generation are executed entirely client-side in the user's browser environment. No telemetry, user statistics, or data logs are sent off-device or shared with third parties.

### 2. Salesforce Access Permissions
The Extension requests cookie access and host permissions strictly to communicate with the user's authenticated Salesforce instance. This communication is restricted to active local tabs and is used solely to query security setup information (such as profiles and object permissions) on behalf of the user.

### 3. Local Storage & Export
The Extension utilizes Chrome's local storage API to save user UI preferences (e.g., Light/Dark mode). The Excel workbook generation runs locally in memory, and the file is exported to the local machine's storage using Chrome's Downloads API.

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-06-07 | Initial release draft with Unified Profiles & Permission Sets audit, system permission matrix, and Excel exports. | Draft |
