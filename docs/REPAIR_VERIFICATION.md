# Business Workflow Repairs

## Implemented

- Existing local data is read from the original storage key. New installations start empty.
- Legacy installations must create an administrator account without resetting their business data.
- Passwords use salted PBKDF2-SHA256 hashes; sessions are not persisted. Administrators create and disable cashier accounts.
- Cashier operations are limited to sales, customers and customer payments. Administrative mutations also check the role in the store.
- Sales validate stock and amounts, retain line quantities, prices, historical costs, discounts and payment method, and commit invoice, customer balance and stock together.
- Purchases retain invoice lines and update stock, weighted average cost and supplier balances together.
- Customer and supplier payments are separate ledger entries. Invoice paid/status fields describe the initial transaction, not later payments.
- Product attributes, expense categories and business settings use submitted values.
- Backup imports validate records before replacement and require UI confirmation. Backups exclude login credentials; restore preserves current accounts.
- Reports use stored values and date ranges. Missing historical dates and invoice line costs are not fabricated.
- CSV export, printable invoices/reports, supplier creation and account statements are implemented.
- RTL navigation is positioned on the right with matching content clearance; navigation and wide tables scroll independently. Typography and controls are enlarged.

## Verification

- TypeScript and production Vite build pass.
- `node scripts/check-transactions.cjs` passes direct assertions against the application modules for sales, stock limits, payments, purchasing, cost history, storage failure atomicity, settings, backup validation, authentication, cashier permissions and legacy backups.
- Additional Vitest coverage exists in `src/store.test.ts`; the Vitest runner could not start under the current sandbox directory restrictions. Elevated execution was rejected by automatic approval review due to the usage limit.
- The updated browser layout could not be visually verified: headless Edge timed out under the sandbox. Earlier setup-only screenshots do not verify this broader update.
- A Windows installer was not rebuilt; Rust/Cargo is unavailable in this environment.

## Boundaries

- Storage remains local browser/WebView storage. Account roles restrict normal application use; they do not protect files from someone controlling the operating-system account or developer tools. Business data itself is not encrypted.
- Pre-existing invoices without item details cannot yield exact historical profit. Pre-existing textual dates cannot reliably be assigned to calendar periods.
- Native Windows printing, download behavior and installation need a desktop acceptance test before a new release is distributed.
