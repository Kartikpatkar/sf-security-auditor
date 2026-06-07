# 🛡️ SF Security Auditor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-0.1.0-green.svg)](#)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg?logo=google-chrome)](#)

> **Tagline**: *Privacy-first, offline Salesforce security auditing and compliance reporting workspace built on Chrome Manifest V3.*

---

## 🌟 Overview

**SF Security Auditor** is a local-first security auditing toolkit designed for Salesforce Administrators, security professionals, and compliance auditors. It runs entirely inside your browser client to scan, analyze, and export Salesforce security configurations—**without sending any credentials, metadata, or user statistics to external servers**.

---

## 🚀 Key Features

*   **Unified Profiles & Permission Sets Baseline**: Audit security permissions, license types, and user counts side-by-side. 
*   **Impicit Standard Profile Mapping**: Out-of-the-box support for standard profile implicit permissions (e.g. standard report running & exporting).
*   **System Permissions Matrix**: Scan for high-risk system access rules (e.g., *Modify All Data*, *API Enabled*, *Author Apex*).
*   **Critical Data Compliance Auditing**: Built-in support for five core compliance permissions:
    *   *Password Never Expires* (`PermissionsPasswordNeverExpires`)
    *   *Manage Sharing* (`PermissionsManageSharing`)
    *   *Manage IP Addresses* (`PermissionsManageIPAddresses`)
    *   *Bulk API Hard Delete* (`PermissionsBulkApiHardDelete`)
    *   *View All Users* (`PermissionsViewAllUsers`)
*   **Object Access Matrix**: Maps CRUD operations, View All, and Modify All records across standard, custom, and managed package objects, including Permission Set Group aggregation.
*   **Metadata Surface Snapshot**: Describe metadata types and get exact counts of Apex Classes, Custom Objects, Profiles, and Permission Sets.
*   **Multi-Sheet Excel Workbook Export**: Export beautiful, fully formatted, styled Excel workbooks containing all audit data with custom sheet summary metadata.
*   **Dynamic Theme Toggle**: Switch seamlessly between premium Dark Mode and Light Mode, with settings persisted locally.
*   **CWS & MV3 Compliant**: 100% offline runtime operation with zero remote resource references (removed Google Fonts / CDNs for strict Content Security Policy compliance).

---

## 🔌 Supported Salesforce Domains

The extension has configured host permissions to connect securely across the following Salesforce environments:

*   Standard Instances: `https://*.salesforce.com` & `https://*.force.com`
*   Lightning Experience: `https://*.lightning.force.com`
*   My Domain Instances: `https://*.my.salesforce.com`
*   Classic & Visualforce: `https://*.visual.force.com`
*   Setup Domains: `https://*.salesforce-setup.com` & `https://*.my.salesforce-setup.com`
*   Login Portals: `https://login.salesforce.com` & `https://test.salesforce.com`

---

## 🛠️ Development & Deployment

The project contains no external npm dependencies, running strictly on local libraries to support offline reliability.

### 1. Validate Codebase
Ensure JavaScript syntax is clean and compliant:
```bash
node scripts/validate.mjs
# Output: validation ok
```

### 2. Load the Extension in Chrome
1. Navigate to `chrome://extensions` in Google Chrome.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the root folder of this repository.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.