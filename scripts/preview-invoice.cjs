// Generate a local, synthetic invoice for visual QA; no customer data is used.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename)
}
const { invoiceHtml } = require('../src/lib/invoice.ts')
const { emptyData } = require('../src/lib/data.ts')
const business = { ...emptyData.business, name: 'متجر البركة', address: 'بنغازي، ليبيا', phone: '0912345678', logo: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../logo.png')).toString('base64') }
const sale = { id: 'SAL-abda662e-fade-4170-98c9-78f3988a4afb', customer: 'أحمد الصالحين', total: 790000, paid: 390000, status: 'جزئية', date: '2026-09-14T09:41:00', cashier: 'طارق', items: 20, discount: 10000, method: 'نقدي', lines: [{ productId: 'rice', name: 'رز بسمتي', unit: 'كيس', qty: 20, price: 40000, cost: 30000 }] }
const output = path.join(__dirname, '../dist/invoice-preview.html')
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, invoiceHtml(business, sale))
console.log(output)
