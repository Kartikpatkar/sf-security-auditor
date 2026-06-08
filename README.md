# 🛡️ SF Security Auditor – Privacy-First Salesforce Audit & Compliance Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-0.1.0-blue.svg)](#)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg?logo=google-chrome)](https://chromewebstore.google.com/detail/mbanedjmimggapgpcnlhbndmdmehpolj?utm_source=item-share-cb)
[![Salesforce](https://img.shields.io/badge/Salesforce-Metadata%20API-00A1E0.svg)](#)

> **Tagline**: *Audit, analyze, and export Salesforce profiles, system permissions, and object access locally—securely, privately, and instantly.*

---

## ✨ Overview

**SF Security Auditor** is a modern, privacy-first **Chrome Extension** that helps you **audit Salesforce security baselines, map object access permissions, analyze risk profiles, and generate audit-ready Excel reports** directly from your browser—no credential storage, no middleware, and no external servers.

Built for Salesforce administrators, security architects, and compliance officers who need to review:

*   Profiles and Permission Sets configurations side-by-side
*   System permissions risk exposure (e.g., *Modify All Data*, *API Enabled*)
*   Data compliance requirements (e.g., *Manage IP Addresses*, *Bulk API Hard Delete*)
*   CRUD operations and record access boundaries
*   Metadata types and code footprint counts

The extension operates **100% locally in-browser**, leveraging your active Salesforce session cookies to compile detailed audit matrices with speed and strict data privacy.

---

## 🚀 Key Features

### 🔐 Salesforce Org Detection & Local Connection

*   Automatically detects the **currently active Salesforce tab**
*   Supports all Salesforce instances:
    *   Production
    *   Sandbox
    *   Developer Edition
    *   Scratch Orgs
*   Uses active browser session cookies (`sid` cookie)
*   No complex OAuth setups
*   No credentials stored or transmitted off-device
*   Real-time connection status pill with detailed org metrics (Instance, API version, UI Type, Org Type)

---

### 👥 Unified Profiles & Permission Sets Inventory

*   Inventories Salesforce Profiles and Permission Sets side-by-side in a single view
*   **Active User Assignment Counts**: Queries real-time active user assignments to prioritize high-impact rows
*   **Standard Profile Permission Overrides**: Applies hardcoded Salesforce default report permissions so standard profiles show actual implicit settings (e.g. standard report running and exporting)
*   **Detailed Metadata Enrichment**: Retrieves metadata archives to extract:
    *   MFA Status
    *   Session timeout settings
    *   Login IP restrictions
*   **Client-Side Controls**: Search, sort (e.g., *Severity: High → Low*, *Users: High → Low*), and filter (by severity and metadata enrichment status) rows in real-time

---

### 🛡️ System Permissions & Compliance Audits

*   Scans 19 high-value system permissions across all profiles and permission sets
*   Pre-configured **System Permission Catalog** containing severity flags, compliance categories, and actionable recommendations
*   **Data Compliance Auditing**: Evaluates five critical compliance permissions:
    *   `PermissionsPasswordNeverExpires` (Password Never Expires)
    *   `PermissionsManageSharing` (Manage Sharing)
    *   `PermissionsManageIPAddresses` (Manage IP Addresses)
    *   `PermissionsBulkApiHardDelete` (Bulk API Hard Delete)
    *   `PermissionsViewAllUsers` (View All Users)
*   **Smart Query Engine**: Optimizes org loading times using a fast-path query block to detect supported permissions in a single request, preventing round-trip latency

---

### 📊 Object Access Matrix

*   Aggregates Object CRUD (Read, Create, Edit, Delete) and View All/Modify All records permissions
*   Supports mapping across:
    *   Standard Objects
    *   Custom Objects (`__c`)
    *   Managed Package Objects (`__` namespaces)
*   **Permission Set Groups Support**: Automatically maps and resolves aggregated object permissions inherited through active Permission Set Groups

---

### 📂 Metadata Surface Snapshot

*   Queries and inspects all metadata types defined in the connected org
*   Fetches total counts for Apex Classes, Custom Objects, Profiles, and Permission Sets
*   Bypasses caches dynamically using refresh controls to pull fresh metadata members

---

### 📊 Formatted Excel Reports Export

*   Generates **fully formatted, styled multi-sheet Excel workbooks** locally in-browser
*   Separate sheets generated automatically for *Overview*, *Profiles & Permission Sets*, *Permissions*, *Object Access*, and *Metadata*
*   **Summary Metadata Rows**: Includes timestamps, metadata sources, and summary counts above each table
*   Exports files named cleanly based on org name and timestamp (e.g., `sf-security-auditor/org-name/timestamp/audit-workbook.xlsx`)

---

### 🌓 Premium Theme Workspace

*   Beautiful sidebar visual layout with glassmorphic elements
*   **Light & Dark Theme Toggle**: Easily switch styling overrides with a simple toggle button
*   Persistent theme state saved locally in the browser (`localStorage`)
*   **CWS & MV3 Compliant**: Zero external dependencies or CDN calls (all fonts and libraries are fully packaged offline to comply with Chrome Web Store CSP rules)

---

## 📸 Screenshots

### 🔷 Light Mode

![Light Mode - Main Page](./assets/screenshots/Main%20Screen%20-%20Light%20Theme.png)
![Light Mode - Profile Inventory](./assets/screenshots/Profile%20Screen%20-%20Light%20Theme.png)

### 🌑 Dark Mode

![Dark Mode - Main Page](./assets/screenshots/Main%20Screen%20-%20Dark%20Theme.png)

---

## 🛠️ Installation & Development

### 1. Load the Extension in Chrome
1. Navigate to `chrome://extensions` in Google Chrome.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the root folder of this repository.

### 2. Validate Project Syntax
Verify code compliance and syntax correctness:
```bash
node scripts/validate.mjs
# Output: validation ok
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
