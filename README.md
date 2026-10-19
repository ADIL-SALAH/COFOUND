# CoFound — Simple Shared Business Task, Expense & Wallet Manager

A lightweight, responsive web application built on the **MERN stack** (MongoDB, Express.js, React, Node.js) for two business partners to coordinate work, track personal & company business expenses with dynamic atomic payment IDs, manage liquid company cash and bank accounts, and handle fair partner reimbursements with mathematical precision in Indian Rupees (₹).

---

## How to Run in VS Code After Unzip/Extract

### Step 1: Open the Project
1. Extract the downloaded zip file on your computer.
2. Open **Visual Studio Code**.
3. Go to **File > Open Folder...** and select the extracted `cofound` folder.

### Step 2: Install Dependencies
Open the integrated terminal in VS Code (**Terminal > New Terminal** or `Ctrl + \``) and run:

```bash
npm install --legacy-peer-deps
```

> **Why `--legacy-peer-deps`?**
> Newer versions of npm (v7+) can encounter peer dependency resolution conflicts (`npm error code ERESOLVE`) between Vite and build tools. Adding `--legacy-peer-deps` guarantees a clean, error-free install of all packages including `tsx`, `express`, `mongoose`, and `react`.

### Step 3: Start the Development Server
In the same terminal, run:

```bash
npm run dev
```

The terminal will confirm:
```text
Resilient embedded MongoDB started at: mongodb://127.0.0.1:...
Mongoose connected to embedded MongoDB successfully.
CoFound Server running on http://0.0.0.0:3000 [development]
```

### Step 4: Open in Your Browser
Visit [http://localhost:3000](http://localhost:3000).

- **Default Demo Accounts**:
  - **Partner A (Owner)**: `adil@cofound.demo` | Password: `password123`
  - **Partner B (Member)**: `rohan@cofound.demo` | Password: `password123`
  - **Invite Code**: `APEX26`
- You can also register a brand new account and create your own workspace with 1 click.

---

## How to Delete a Workspace in CoFound

Only the workspace **Owner** can permanently delete a workspace. Team **Members** can leave a workspace.

### Method 1: From the Top Navigation Bar
1. Click the workspace dropdown at the top of the screen (next to the CoFound logo, e.g. **Apex Ventures**).
2. Click **"Manage / Delete Workspace"**.
3. Scroll down to the red **Danger Zone** section at the bottom.
4. Click **"Delete Workspace"**.
5. Confirm in the dialog. All associated goals, tasks, expenses, company wallets, ledger transactions, and receipts are permanently cascade-deleted.

### Method 2: From the Sidebar
1. Click **Team & Members** in the left navigation sidebar.
2. Scroll to the bottom of the page to find the **Danger Zone** card.
3. Click **"Delete Workspace"** (or **"Leave Workspace"** if you are a non-owner member).
4. Confirm the prompt.

---

## Key Features

1. **Goals & Checklist Tasks (Module 1)**:
   - High-level business goals (Branding, Product Sourcing, Website Development, etc.).
   - Minimal task checklist with instant check-off toggles, strikethrough styling, and progress counters (`4 of 7 completed`).
   - Clean, clutter-free design with no bloated Jira/Kanban workflows.

2. **Expenses & Bills (Module 2)**:
   - Every expense receives an automatically generated, concurrency-safe payment ID (e.g., `PAY-2026-0001`).
   - Clearly distinguishes between **Partner Personal** payments and **Company Wallet** payments.
   - Private receipt uploads (JPG, PNG, PDF up to 5MB) accessible only to authenticated workspace members.
   - Search, filter by category, payment source, and date range.

3. **Partner Reimbursement Liabilities (Module 3)**:
   - Automatically maintains an accurate liability balance for each partner who pays business costs out-of-pocket.
   - Standard display convention: `−₹2,000` indicates that the company owes the partner ₹2,000.
   - Settle liabilities in full or in part directly from liquid company cash or bank wallets.

4. **Company Wallet Management (Module 4)**:
   - Liquid company accounts: **Company Cash**, **Company Bank 1**, and **Company Bank 2** (plus user-created custom wallets).
   - Invariant: Company wallets **never** drop below zero (overdraft protection).
   - Add funds from partner contributions, business income, or other sources.
   - Inter-wallet transfers with balance checks and linked transaction group IDs that conserve total company funds.

5. **Double-Counting Prevention & Ledger Integrity**:
   - Personally paid expenses are counted once in business expenses and create a reimbursement liability.
   - Settlements reduce the paying company wallet and reduce the partner liability, without creating duplicate expenses.
   - Transfers between company wallets never alter business expense or income figures.
   - Authoritative transaction journal (`TXN-YYYY-XXXX`) maintains auditability.

---

## Automated Tests

Run the financial validation test suite:

```bash
npm test
```

The test suite validates:
1. Dynamic atomic payment and transaction sequencing (`PAY-YYYY-XXXX` and `TXN-YYYY-XXXX`).
2. Checklist task completion tracking.
3. Personal expenses creating reimbursement liabilities without altering company wallets.
4. Partial settlements reducing wallet and outstanding liability.
5. Multiple settlements reaching zero outstanding balance.
6. Insufficient funds guard preventing overdraft and preserving balances.
7. Over-settlement prevention beyond outstanding debt.
8. Company-paid expenses decreasing wallets without creating personal liabilities.
9. Inter-wallet transfers strictly conserving total company funds.
10. Cascade workspace deletion cleanly purging all child records.

---

## Production Build

To compile static frontend assets and launch in production:

```bash
npm run build
npm start
```
