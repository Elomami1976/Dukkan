# قائمة التحقق للإصدار

- [ ] تثبيت نظيف على Windows 10/11.
- [ ] إعداد النشاط وحساب المدير.
- [ ] إنشاء منتج وتصنيف ووحدة وباركود.
- [ ] إدخال مخزون افتتاحي ثم بيع نقدي وآجل.
- [ ] التحقق من رصيد العميل والدفعة.
- [ ] شراء من مورد والتحقق من زيادة المخزون.
- [ ] مرتجع بيع ومرتجع شراء.
- [ ] تسجيل مصروف ومراجعة التقرير.
- [ ] طباعة 80mm وA4 وتصدير CSV/PDF.
- [ ] إنشاء نسخة احتياطية واسترجاعها على تثبيت نظيف.
- [ ] تشغيل دون إنترنت.
- [ ] التحقق من صلاحيات Admin وCashier.

## Dashboard redesign verification — 2026-10-27

- Passed: 40 unit/transaction tests, including 11 analytics cases and 2 dashboard permission/preference cases. The date-focused suite passed again after rejecting impossible legacy dates.
- Passed: 3 browser scenarios in isolated Microsoft Edge contexts, covering KPI values, reporting filters, navigation, saved customization, cashier access, RTL, reduced motion, no external requests, offline interaction, and 1440/1024/390px widths.
- Passed: ESLint, TypeScript and production Vite build.
- Passed: direct SQLite migration/reopen integrity and snapshot-preservation check using an in-memory fixture, without touching a business database.
- Actual application screenshot: docs/assets/dashboard-glass-desktop.png, using explicitly labeled isolated test records.
- Initial local attempt (superseded by successful CI validation): BLOCKED. The installed Visual Studio 2015 linker failed with LNK1107 and LNK2019. The verified Microsoft Build Tools 2022 installer exited with code 1602. No new installer was produced; no native startup or installation was validated.
- Passed on Windows CI: frontend checks, browser tests, native database/authorization tests, NSIS build, automated install and launch smoke check.
- Website and updated v1.1.0 installer published. [Build evidence](https://github.com/Elomami1976/Dukkan/actions/runs/40563018411). The unchecked manual checklist above remains unverified.
