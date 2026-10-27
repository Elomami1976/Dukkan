# Dashboard implementation and review record

## Repository findings

The application uses React 18, Zustand, Vite, TypeScript, Tauri 2 and rusqlite. Five existing SQLite migrations create relational tables and the authoritative `app_state` JSON snapshot. Current transaction code persists that snapshot; the older relational sales tables are not the source of current business records. The dashboard reads the existing snapshot and never migrates or rewrites invoices. Browser preview uses the existing localStorage fallback.

Existing modules: POS, products, purchases, sales, inventory adjustments, batch expiry, FEFO, disposal, supplier returns, customers, suppliers, payments, expenses, reports, users, fiscal years, backup/restore. No work-order module or invoice due dates exist. Customer sale returns are not a separate financial transaction type; dashboard totals reflect recorded sales, without inventing return adjustments.

## Implementation

- Shared integer-millime analytics in `src/lib/dashboard.ts`, used by both modes.
- Native dashboard endpoint verifies an in-memory session established against the existing PBKDF2 credentials, and rechecks active admin status and credential hash against SQLite on each read. It removes credentials from its response.
- Existing application-wide snapshot read/write IPC is unchanged. This dashboard gate does not turn the legacy renderer-owned transaction/authentication architecture into a tamper-proof security boundary. A full native transaction-service migration remains separate work.
- SQLite reads use the existing single-row primary key. Aggregation is a linear pass over the authoritative snapshot, not queries against stale relational tables. A normalized SQL analytics index is not introduced in this change.
- React reloads analytics after store changes, including payments, backup restores, adjustments and invoice writes. Pending reads are discarded when their filter changes. No stale cross-session analytics cache is retained.
- Local per-user customization has a separate versioned storage key and does not change financial backups or transactions. A failed preference write retains the previous layout and displays an error. Preferences are device-specific and are not included in business backups.
- Native CSS charts provide pointer/keyboard value inspection, textual values, zero and missing-data states without a cloud service or chart runtime dependency.
- Locally bundled Noto Sans Arabic is unmodified, with OFL 1.1 and source hashes in `public/fonts`.

## Calculation definitions

All amounts are integer millimes. Unsafe integer totals produce an error. Average invoice values alone are rounded to the nearest millime for display. Percentages are display ratios, never persisted money.

Revenue = recorded invoice total after invoice discount. COGS = historical batch allocation quantities × their unit costs, falling back only to the saved sale-line cost. Missing invoice lines make period profit/margin/result unavailable. Gross profit = revenue − COGS. Net operating result = gross profit − operating expenses − recorded disposal losses. These are not cash balances or statutory net income.

Invoice discount is allocated proportionately using cumulative BigInt arithmetic. Rounding is distributed across lines without assigning accumulated remainders above a product's gross value. Product totals reconcile exactly with invoice net revenue. Invoices without lines are excluded from product rankings with a visible explanation.

Receivables = positive current customer balances. Payables = positive current supplier balances; supplier credits are not netted against other suppliers. Receipts = period sale payments plus subsequent customer payments. Supplier payments = payments at purchase plus subsequent supplier payments. Due-date aging is unavailable.

Inventory value includes all tracked stock, including inactive items and expired batches still physically held. Batch-tracked stock uses batch unit costs, other stock uses the existing current product cost. Status counts include active inventory products only: zero stock; positive stock ≤ minimum; positive stock > minimum. Expiry counts are batches with quantity > 0, using each product's warning window. Expiry today remains eligible under the existing business rule. Batches and product counts are not combined into one total.

## Dates and insights

Calendar days use the application's existing local-date interpretation for timestamps; date-only records retain their date. Previous periods immediately precede the selection and contain the same number of days, including DST and leap-year boundaries. Month/fiscal-year-to-date ends today. Growth is unavailable when the previous revenue is zero. Legacy unparseable dates are excluded with a warning. Balance and stock cards explicitly show current, all-period state.

Every emitted insight carries its rule and navigation destination. Sales growth requires previous sales > 0; margin decline requires known costs and positive revenue in both periods; expense ratios require positive sales. Restocking uses configured minimum stock, expiry uses configured per-product warning days, disposal uses recorded losses, and balance reminders require positive recorded balances. No overdue claims, predictions or causes are inferred.

## Release validation

Run `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e`, `cargo +stable test --manifest-path src-tauri/Cargo.toml`, and the existing Tauri Windows build. Browser tests use disposable contexts and explicit test business records. Website screenshots must identify these as test records. Native installer validation is tracked separately; frontend/browser tests do not establish that an installer works. Do not publish as a production release until native tests and installer validation pass.
