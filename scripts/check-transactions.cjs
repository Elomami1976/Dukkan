const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

// Run the application modules directly when the Vite worker cannot start in a restricted environment.
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
  module._compile(result.outputText, filename)
}
let saved = ''
global.localStorage = { getItem: () => saved || null, setItem: (_key, value) => { saved = value } }
const { useAppStore } = require('../src/store.ts')
const { emptyData, parseBackup } = require('../src/lib/data.ts')
const { parseMoney } = require('../src/lib/money.ts')
async function check() {
  const s = useAppStore.getState()
  await s.completeSetup({ ...emptyData.business, name: 'QA Store' }, { name: 'Admin', username: 'admin', password: 'QA-only-123' })
  assert(!saved.includes('QA-only-123'))
  s.addProduct({ name: 'Rice', sku: 'R1', category: 'Food', unit: 'Bag', price: 5000, cost: 2000, wholesalePrice: 4000, stock: 3, minStock: 1, trackInventory: true, status: 'active' })
  s.addCustomer({ name: 'Customer', phone: '', city: '' }); s.addSupplier({ name: 'Supplier', phone: '', city: '' })
  const productId = useAppStore.getState().products[0].id, customerId = useAppStore.getState().customers[0].id, supplierId = useAppStore.getState().suppliers[0].id
  const before = saved
  assert.throws(() => s.completeSale([{ productId, qty: 2 }, { productId, qty: 2 }], 20000, '', 'نقدي', 0))
  assert.equal(saved, before)
  const sale = s.completeSale([{ productId, qty: 1 }], 5000, customerId, 'بطاقة', 0)
  assert.equal(sale.lines[0].cost, 2000)
  assert.equal(sale.method, 'بطاقة')
  assert.equal(useAppStore.getState().customers[0].purchases, 5000)
  s.completeSale([{ productId, qty: 1 }], 1000, customerId, 'نقدي', 500)
  assert.equal(useAppStore.getState().customers[0].balance, 3500)
  s.recordPayment('customer', customerId, 500, '')
  assert.equal(useAppStore.getState().customers[0].balance, 3000)
  assert.throws(() => s.recordPayment('customer', customerId, 4000, ''))
  s.completePurchase(supplierId, [{ productId, qty: 3, cost: 4000 }], 2000, '2026-09-12', '')
  assert.equal(useAppStore.getState().products[0].stock, 4)
  assert.equal(useAppStore.getState().products[0].cost, 3500)
  assert.equal(useAppStore.getState().suppliers[0].balance, 10000)
  assert.equal(useAppStore.getState().sales[1].lines[0].cost, 2000)
  assert.throws(() => s.adjustStock(productId, -5, 'test'))
  s.adjustStock(productId, -1, 'Damaged')
  assert.equal(useAppStore.getState().movements[0].balance, 3)
  s.addExpense({ category: 'نقل', note: 'Delivery', amount: 2000 })
  assert.equal(useAppStore.getState().expenses[0].category, 'نقل')
  s.updateBusiness({ phone: '123', address: 'City', taxNumber: '456', type: 'خدمات' })
  assert.equal(JSON.parse(saved).state.business.phone, '123')
  const backup = s.backup(), hash = useAppStore.getState().users[0].hash
  assert(!backup.includes(hash))
  const bad = JSON.parse(backup); bad.data.business = null
  const good = saved
  assert.throws(() => s.restoreBackup(JSON.stringify(bad))); assert.equal(saved, good)
  bad.data.business = emptyData.business; bad.data.products[0].price = 'wrong'
  assert.throws(() => s.restoreBackup(JSON.stringify(bad)))
  s.updateBusiness({ name: 'Changed' }); s.restoreBackup(backup)
  assert.equal(useAppStore.getState().business.name, 'QA Store')
  assert.equal(useAppStore.getState().users[0].hash, hash)
  const setItem = localStorage.setItem
  localStorage.setItem = () => { throw new Error('quota') }
  const stock = useAppStore.getState().products[0].stock
  assert.throws(() => s.completeSale([{ productId, qty: 1 }], 5000, '', 'نقدي', 0))
  assert.equal(useAppStore.getState().products[0].stock, stock)
  localStorage.setItem = setItem
  await s.addUser('Cashier', 'cash', 'cash-test-123', 'cashier')
  s.logout(); await assert.rejects(s.login('admin', 'wrong'))
  await s.login('cash', 'cash-test-123')
  assert.throws(() => s.updateBusiness({ name: 'forbidden' }))
  assert.throws(() => s.completePurchase(supplierId, [{ productId, qty: 1, cost: 100 }], 100, '2026-09-12', ''))
  await assert.rejects(s.addUser('Bad', 'bad', 'bad-test-123', 'admin'))
  assert.throws(() => s.backup())
  s.completeSale([{ productId, qty: 1 }], 5000, '', 'نقدي', 0)
  s.logout(); assert.equal(useAppStore.getState().sessionId, null)
  await s.login('admin', 'QA-only-123')
  for (const value of [-1, Infinity, NaN, 'bad', '1.0001']) assert.throws(() => parseMoney(value))
  assert.equal(parseMoney('١٢٫٥٠٠'), 12500)
  const legacy = { ...emptyData, business: { ...emptyData.business, name: 'Old' }, sales: [{ id: 'old', customer: 'Old', total: 1000, paid: 0, date: 'أمس', status: 'آجلة', cashier: 'Old', items: 1 }] }
  assert.equal(parseBackup(JSON.stringify({ format: 'Dukkan Backup', version: 1, data: legacy })).sales[0].lines, undefined)
  console.log('PASS: atomic sales, overstock rejection, payments, purchases, historic costs, stock adjustments, expenses, settings, backup validation, quota failures, authentication, cashier permissions, legacy backup, money parsing.')
}
check().catch(e => { console.error(e); process.exitCode = 1 })
