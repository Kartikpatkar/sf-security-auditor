# SF Security Auditor

Privacy-first Salesforce security auditing Chrome Extension built on Manifest V3.

## Current Status

The repository now contains the first development scaffold for the MVP:

- Manifest V3 extension structure
- Background service worker for settings bootstrap
- Salesforce content script bridge
- Reused Salesforce helper scripts from the previous project for org detection and metadata/member inspection
- Full-page extension app for org detection and overview audit
- Multi-section dashboard with Overview, Profiles, Permissions, Object Access, and Metadata sections
- Same-origin Salesforce API access from the active tab using browser session cookies
- Initial overview audit for org name, instance, users, profiles, permission sets, and guest-user signal
- First real audit module: profile inventory with active-user counts and profile-level permission flags
- System permissions matrix for profiles and permission sets with severity, categories, and recommendations
- Object access matrix for profiles, permission sets, and aggregated permission set groups
- Metadata inventory powered by the reused `OrgDetector`, `SalesforceMetadataAPI`, and `SalesforceMembers` helpers

## Why This Architecture

The extension currently avoids extracting or storing Salesforce session tokens. Instead, it performs same-origin requests from the active Salesforce tab through the content script. That keeps the initial implementation closer to the product goal of minimal permissions and local-only processing.

## Project Structure

```text
manifest.json
package.json
scripts/
	validate.mjs
src/
	app/
		app.css
		app.html
		app.js
	background/
		service-worker.js
	content/
		content-script.js
		page-bridge.js
```

## Current Workflow

1. Open a logged-in Salesforce tab.
2. Click the extension action.
3. The extension opens a dedicated full-page app tab.
4. Detect org context.
5. Run the overview audit.
6. Run profile inventory from the Profiles section.
7. Run system permissions from the Permissions section.
8. Run object access from the Object Access section.
9. Run metadata inventory from the Metadata section.

## Supported Salesforce Origins

The extension currently targets these Salesforce surfaces:

- `https://*.salesforce.com/*`
- `https://*.lightning.force.com/*`
- `https://*.my.salesforce.com/*`
- `https://*.visual.force.com/*`
- `https://*.force.com/*`
- `https://*.salesforce-setup.com/*`
- `https://*.my.salesforce-setup.com/*`
- `https://login.salesforce.com/*`
- `https://test.salesforce.com/*`

## Development

Validate the current scaffold:

```bash
npm run validate
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Choose Load unpacked
4. Select this repository root

## MVP Next Steps

- Add export pipeline for Excel workbooks
- Enrich profile inventory with Metadata API-backed MFA, session restrictions, and login IP restrictions
- Expand the risk engine beyond initial guest-user, profile-level, and system-permission signals
- Refine permission set group object access with muting-aware aggregation if needed