# 🔒 Privacy Policy for SF Security Auditor

*Last updated: June 7, 2026*

This Privacy Policy describes how the **SF Security Auditor** Chrome Extension (the "Extension") handles your data. As a privacy-first tool, our core philosophy is simple: **your data belongs to you, and it never leaves your machine.**

---

## 1. Data Collection

The Extension is designed to operate locally and securely. 

*   **No Personal Data Collection**: The Extension does not collect, record, or request any personally identifiable information (PII) such as names, email addresses, phone numbers, or mailing addresses.
*   **No Salesforce Credentials Stored**: The Extension does not ask for, capture, or store your Salesforce usernames, passwords, or security tokens. It routes Salesforce query requests using your browser's existing authenticated cookie session (`sid` cookie).
*   **Audit Results**: All security audit results (profiles, user counts, permissions, object access matrices) are compiled dynamically in your browser memory during the active session. This data is never collected or logged by us.

---

## 2. Data Storage & Sharing

*   **100% Local Processing**: All security calculations, queries, and Excel report generations occur entirely client-side on your local device.
*   **Local UI Preferences**: The Extension utilizes your browser's local storage (`localStorage`) solely to persist your theme preference (Light/Dark mode) across sessions.
*   **No Third-Party Transmission**: We do **not** transmit any of your configuration metadata, security scores, user lists, or settings to developer-owned or third-party servers. No telemetry, tracker, or remote analytics service is embedded in this extension.
*   **No Data Selling**: Since we do not collect or transmit any data, we do not—and will never—sell, trade, or rent your data to anyone.

---

## 3. Salesforce API Connections

To perform security audits, the Extension connects to your logged-in Salesforce instance. This connection:
*   Occurs only on demand when you click **Detect Org** or run an audit module.
*   Uses safe, same-origin browser request headers.
*   Queries standard Salesforce REST/SOAP APIs to compile local security matrices.
*   Bypasses remote servers to maintain strict confidentiality.

---

## 4. Report Exports

When you export your security workbook, the Excel file (`.xlsx` format) is built entirely in browser memory using the local `ExcelJS` library. The file is saved directly to your local computer's Downloads directory using the Chrome Downloads API.

---

## 5. Changes to This Policy

We may update this Privacy Policy from time to time. Any changes will be published directly in the repository's `PRIVACY.md` file. We encourage you to review this file periodically to stay informed about our privacy practices.

---

## 6. Contact

If you have any questions or feedback regarding your privacy while using the Extension, please contact us at:
*   **Support Link**: [GitHub Issues Page](https://github.com/Kartikpatkar/sf-security-auditor/issues)
*   **Email**: kartikkp.assets@gmail.com (replace with publisher support email)
