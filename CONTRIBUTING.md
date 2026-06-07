# 🤝 Contributing to SF Security Auditor

Thank you for your interest in contributing to **SF Security Auditor**! We welcome contributions to make this privacy-first Salesforce security auditor more robust, performant, and user-friendly.

---

## 🏗️ Code of Conduct

By participating in this project, you agree to maintain a respectful, welcoming, and collaborative environment.

---

## 🛠️ Getting Started

### 1. Setup Your Environment
1. Clone this repository locally.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the root directory of this repository.

### 2. Verify Your Changes
We run a lightweight validation script to check syntax correctness across all core JavaScript and manifest configuration files. Always run this command before committing:
```bash
node scripts/validate.mjs
```
Ensure it returns `validation ok` with no syntax issues.

---

## 📜 Development Guidelines

To ensure the extension remains performant and complies with Google Chrome Web Store policies, please follow these guidelines:

### 1. 100% Offline-First (No Remote CDN Calls)
*   **No Remote Resources**: Do not reference external stylesheets, fonts, or scripts (e.g. CDNs like Google Fonts, Cloudflare, unpkg, etc.). Under Manifest V3's strict Content Security Policy, all assets must be packaged locally.
*   **Offline Libraries**: Place any third-party minified libraries inside `src/lib/` and reference them relatively.

### 2. Code Quality & Extension Architecture
*   **Asynchronous JavaScript**: Use modern `async/await` syntax for asynchronous logic and Chrome API invocations. Avoid nested `.then()` chains.
*   **Ephemeral Background Worker**: Do not store global state variables inside `src/background/service-worker.js`. Persist user parameters using `chrome.storage.local`.
*   **Manifest Permissions**: Only request permissions in `manifest.json` that are strictly necessary for core functionality. Keep `host_permissions` scoped strictly to Salesforce domains.

### 3. Maintain Store Listing Hub
If you modify permissions, add new data storage, or make user-facing functional changes:
*   Update the **[CHROMEWEBSTORE.md](file:///Users/apple/Desktop/Desktop%20Backup/New%20folder/Project/SF%20Security%20Audit/sf-security-auditor/CHROMEWEBSTORE.md)** file.
*   Add a detailed plain-English justification for any new permission inside the justifications table to prevent CWS review rejections.

---

## 📥 Submitting Pull Requests

1. **Fork & Branch**: Create a feature branch from the `main` branch (e.g. `feature/your-feature-name` or `bugfix/issue-description`).
2. **Commit Message Guidelines**: Write clear, descriptive commit messages summarizing what was changed and why.
3. **Validate**: Run `node scripts/validate.mjs` to confirm syntax validity.
4. **Submit**: Push your branch to GitHub and create a Pull Request. Provide a clear description of your changes, screenshots of UI edits, and how you tested your logic.
