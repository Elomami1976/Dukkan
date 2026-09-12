import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './store'
import { emptyData, parseBackup } from './lib/data'
import type { Product } from './types'

let saved = ''
const business = { ...emptyData.business, name: 'Test Store' }
beforeEach(async () => {
  saved = ''
  vi.stubGlobal('localStorage', { getItem: () => saved || null, setItem: (_key: string, value: string) => { saved = value } })
  useAppStore.setState({ ...structuredClone(emptyData), sessionId: null, loadError: '' })
  await useAppStore.getState().completeSetup(business, { name: 'Admin', username: 'admin', password: 'test-only-123' })
})
function seed() {
  const s = useAppStore.getState()
  s.addProduct({ name: 'Rice', category: 'Food', unit: 'Bag', cost: 2000, price: 5000, wholesalePrice: 4000, stock: 3, minStock: 1, trackInventory: true, status: 'active' })
  s.addCustomer({ name: 'Customer', phone: '', city: '' })
  s.addSupplier({ name: 'Supplier', phone: '', city: '' })
  return { product: useAppStore.getState().products[0], customer: useAppStore.getState().customers[0], supplier: useAppStore.getState().suppliers[0] }
}
describe('business transactions', () => {
  it('updates fully paid customer purchases and stock; retains line cost and payment method', () => {
    const { product, customer } = seed()
    const sale = useAppStore.getState().completeSale([{ productId: product.id, qty: 2 }], 10000, customer.id, 'بطاقة', 0)
    expect(sale.lines?.[0].cost).toBe(2000)
    expect(sale.method).toBe('بطاقة')
    expect(useAppStore.getState().customers[0]).toMatchObject({ purchases: 10000, balance: 0, lastPurchase: sale.date })
    expect(useAppStore.getState().products[0].stock).toBe(1)
    expect(JSON.parse(saved).state.sales[0].id).toBe(sale.id)
  })
  it('rejects overselling even if duplicated cart lines individually fit', () => {
    const { product } = seed(), before = saved
    expect(() => useAppStore.getState().completeSale([{ productId: product.id, qty: 2 }, { productId: product.id, qty: 2 }], 20000, '', 'نقدي', 0)).toThrow()
    expect(saved).toBe(before)
    expect(useAppStore.getState().products[0].stock).toBe(3)
    expect(useAppStore.getState().sales).toHaveLength(0)
  })
  it('records credit, discount and later payments without double counting purchases', () => {
    const { product, customer } = seed(), s = useAppStore.getState()
    s.completeSale([{ productId: product.id, qty: 2 }], 3000, customer.id, 'نقدي', 1000)
    expect(useAppStore.getState().customers[0]).toMatchObject({ balance: 6000, purchases: 9000 })
    s.recordPayment('customer', customer.id, 2000, 'Payment')
    expect(useAppStore.getState().customers[0]).toMatchObject({ balance: 4000, purchases: 9000 })
    expect(() => s.recordPayment('customer', customer.id, 5000, '')).toThrow()
  })
  it('records purchases and updates weighted cost, inventory and supplier debt', () => {
    const { product, supplier } = seed()
    useAppStore.getState().completePurchase(supplier.id, [{ productId: product.id, qty: 3, cost: 4000 }], 2000, '2026-09-12', '')
    expect(useAppStore.getState().products[0]).toMatchObject({ stock: 6, cost: 3000 })
    expect(useAppStore.getState().suppliers[0]).toMatchObject({ purchases: 12000, balance: 10000 })
    expect(useAppStore.getState().purchases).toHaveLength(1)
    expect(useAppStore.getState().movements[0].amount).toBe(3)
  })
  it('leaves the whole transaction unchanged when persistent storage fails', () => {
    const { product } = seed()
    localStorage.setItem = () => { throw new Error('quota') }
    expect(() => useAppStore.getState().completeSale([{ productId: product.id, qty: 1 }], 5000, '', 'نقدي', 0)).toThrow('تعذر حفظ')
    expect(useAppStore.getState().sales).toHaveLength(0)
    expect(useAppStore.getState().products[0].stock).toBe(3)
  })
  it('validates stock adjustments and persists the chosen product attributes and settings', () => {
    const { product } = seed(), s = useAppStore.getState()
    expect(product).toMatchObject({ category: 'Food', unit: 'Bag' })
    expect(() => s.adjustStock(product.id, -4, 'test')).toThrow()
    s.adjustStock(product.id, -2, 'Damaged')
    expect(useAppStore.getState().movements[0]).toMatchObject({ reason: 'Damaged', balance: 1 })
    s.updateBusiness({ phone: '123', address: 'City', taxNumber: '456', type: 'خدمات' })
    expect(JSON.parse(saved).state.business).toMatchObject({ phone: '123', address: 'City', taxNumber: '456', type: 'خدمات' })
    s.addExpense({ category: 'نقل', note: 'delivery', amount: 1000 })
    expect(useAppStore.getState().expenses[0].category).toBe('نقل')
  })
})
describe('accounts and backups', () => {
  it('hashes passwords and requires login after logout', async () => {
    expect(saved).not.toContain('test-only-123')
    const s = useAppStore.getState(); s.logout()
    expect(useAppStore.getState().sessionId).toBeNull()
    expect(() => s.updateBusiness({ name: 'x' })).toThrow()
    await expect(s.login('admin', 'wrong')).rejects.toThrow()
    await s.login('admin', 'test-only-123')
    expect(useAppStore.getState().sessionId).toBeTruthy()
    expect(JSON.parse(saved).state.sessionId).toBeUndefined()
  })
  it('blocks cashier access to administration and purchasing', async () => {
    const { product, supplier } = seed(), s = useAppStore.getState()
    await s.addUser('Cashier', 'cash', 'cash-test-123', 'cashier')
    s.logout(); await s.login('cash', 'cash-test-123')
    expect(() => s.updateBusiness({ name: 'bad' })).toThrow()
    expect(() => s.completePurchase(supplier.id, [{ productId: product.id, qty: 1, cost: 10 }], 10, '2026-09-12', '')).toThrow()
    expect(() => s.backup()).toThrow()
    expect(() => s.completeSale([{ productId: product.id, qty: 1 }], 5000, '', 'نقدي', 0)).not.toThrow()
  })
  it('rejects null business and malformed rows without replacing existing data', () => {
    seed(); const s = useAppStore.getState(), backup = JSON.parse(s.backup()), before = saved
    backup.data.business = null
    expect(() => s.restoreBackup(JSON.stringify(backup))).toThrow()
    backup.data.business = business; backup.data.products[0].price = 'wrong'
    expect(() => s.restoreBackup(JSON.stringify(backup))).toThrow()
    expect(saved).toBe(before)
  })
  it('round trips business backups without exporting or replacing credentials', () => {
    seed(); const s = useAppStore.getState(), user = s.users[0], backup = s.backup()
    expect(backup).not.toContain(user.hash)
    s.updateBusiness({ name: 'Changed' }); s.restoreBackup(backup)
    expect(useAppStore.getState().business.name).toBe('Test Store')
    expect(useAppStore.getState().users[0].hash).toBe(user.hash)
    expect(useAppStore.getState().products).toHaveLength(1)
  })
  it('accepts valid old backups without inventing dates or invoice details', () => {
    const data = { ...structuredClone(emptyData), business, users: undefined, purchases: undefined, movements: undefined, payments: undefined, sales: [{ id: 'old', customer: 'Old', total: 1000, paid: 0, date: 'أمس', status: 'آجلة', cashier: 'Old', items: 1 }] }
    const restored = parseBackup(JSON.stringify({ format: 'Dukkan Backup', version: 1, data }))
    expect(restored.sales[0].date).toBe('أمس')
    expect(restored.sales[0].lines).toBeUndefined()
  })
})
