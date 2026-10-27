import { describe, expect, it } from 'vitest'
import { emptyData } from './data'
import { calculateDashboard, previousRange, resolveRange } from './dashboard'
import { defaults, validatePreferences } from './dashboardPreferences'
import type { Product, Sale } from '../types'

const range = { from: '2026-10-01', to: '2026-10-07' }, today = '2026-10-07'
const sale = (changes: Partial<Sale> = {}): Sale => ({ id: 'S1', customer: '', total: 10001, paid: 5000, status: 'جزئية', date: today, cashier: '', items: 3, discount: 1999, lines: [{ productId: 'P1', name: 'منتج', unit: '', qty: 3, price: 4000, cost: 333, batchAllocations: [{ batchId: 'B1', lotNumber: '', quantity: 1, unitCost: 333 }, { batchId: 'B2', lotNumber: '', quantity: 2, unitCost: 334 }] }], ...changes })
const product: Product = { id: 'P1', name: 'منتج', sku: '1', category: '', unit: '', cost: 9999, price: 4000, wholesalePrice: 4000, stock: 3, minStock: 3, trackInventory: true, trackBatches: true, trackExpiry: true, expiryWarningDays: 7, status: 'active' }
describe('read-only dashboard financial analytics', () => {
  it('uses exact historical allocations, net revenue, and recorded expenses/losses', () => {
    const d = structuredClone(emptyData)
    d.sales = [sale(), sale({ id: 'prior', date: '2026-09-30', total: 5000 })]
    d.expenses = [{ id: 'E', amount: 201, category: 'نقل', note: '', date: today }]
    d.inventoryLosses = [{ id: 'L', totalCost: 334, unitCost: 334, quantity: 1, productId: 'P1', batchId: 'B2', lotNumber: '', kind: 'damaged', reason: '', userId: '', userName: '', date: today }]
    d.products = [product]
    const before = JSON.stringify(d), a = calculateDashboard(d, range, today)
    expect(a).toMatchObject({ revenue: 10001, cost: 1001, grossProfit: 9000, expenses: 201, losses: 334, netResult: 8465, invoiceCount: 1, average: 10001, previousRevenue: 5000 })
    expect(a.products[0]).toMatchObject({ revenue: 10001, profit: 9000, quantity: 3 })
    expect(a.points.reduce((sum,p) => sum + p.sales, 0)).toBe(a.revenue)
    expect(JSON.stringify(d)).toBe(before)
  })
  it('separates current debt and supplier credits from period receipts and payments', () => {
    const d = structuredClone(emptyData), party = { id: 'C', name: '', phone: '', city: '', balance: 6000, purchases: 0, lastPurchase: '' }
    d.customers = [party]; d.suppliers = [{ ...party, balance: 8000 }, { ...party, id: 'credit', balance: -3000 }]
    d.sales = [sale()]; d.purchases = [{ id: 'P', supplierId: 'C', supplier: '', date: today, total: 2000, paid: 1000, lines: [], note: '' }]
    d.payments = [{ id: '1', kind: 'customer', partyId: 'C', amount: 2000, date: today, note: '' }, { id: '2', kind: 'supplier', partyId: 'C', amount: 3000, date: today, note: '' }, { id: '3', kind: 'customer', partyId: 'C', amount: 9000, date: '2026-09-01', note: '' }]
    expect(calculateDashboard(d, range, today)).toMatchObject({ receivables: 6000, payables: 8000, customerPayments: 7000, supplierPayments: 4000 })
  })
  it('does not fabricate profit for invoices with missing historical lines', () => {
    const d = structuredClone(emptyData); d.sales = [sale({ lines: undefined })]
    expect(calculateDashboard(d, range, today)).toMatchObject({ grossProfit: null, margin: null, netResult: null, cost: null, missingCosts: 1 })
  })
  it('handles zero datasets and undefined zero-baseline growth', () => {
    expect(calculateDashboard(emptyData, range, today)).toMatchObject({ revenue: 0, grossProfit: 0, margin: null, average: null, growth: null, insights: [] })
  })
  it('rejects unsafe monetary aggregates instead of rounding silently', () => {
    const d = structuredClone(emptyData); d.sales = [sale({ total: Number.MAX_SAFE_INTEGER }), sale()]
    expect(() => calculateDashboard(d, range, today)).toThrow('الدقة')
  })
  it('allocates discounts across products without losing a millime', () => {
    const d = structuredClone(emptyData); d.sales = [sale({ total: 2, lines: ['a','b','c'].map(id => ({ productId: id, name: id, unit: '', qty: 1, price: 1, cost: 0 })) })]
    const a = calculateDashboard(d, range, today)
    expect(a.products.reduce((s,p) => s + p.revenue, 0)).toBe(2)
    expect(a.products.reduce((s,p) => s + p.profit, 0)).toBe(a.grossProfit)
  })
  it('counts low stock, expiry boundaries, and batch value without double counting', () => {
    const d = structuredClone(emptyData); d.products = [product, { ...product, id: 'P2', stock: 0, trackBatches: false, trackExpiry: false }, { ...product, id: 'P3', stock: 10, trackBatches: false, trackExpiry: false, cost: 100 }]
    d.batches = ['2026-10-06','2026-10-07','2026-10-14','2026-10-15'].map((date,i) => ({ id: String(i), productId: 'P1', lotNumber: '', quantity: 1, unitCost: 101, supplierId: '', purchaseId: '', createdAt: today, expiryDate: date }))
    const a = calculateDashboard(d, range, today)
    expect(a).toMatchObject({ inventoryValue: 1404, low: 1, out: 1, healthy: 1, expired: 1, expiring: 2 })
    expect(a.insights.find(i => i.id === 'expired')?.priority).toBe('critical')
    expect(a.insights.every(i => i.rule && i.destination)).toBe(true)
  })
  it('does not assign accumulated rounding remainders above a product gross value', () => {
    const d = structuredClone(emptyData)
    d.sales = [sale({ total: 99, lines: Array.from({ length: 100 }, (_, i) => ({ productId: String(i), name: String(i), unit: '', qty: 1, price: 1, cost: 0 })) })]
    const a = calculateDashboard(d, range, today)
    expect(a.products.every(p => p.revenue <= 1)).toBe(true)
    expect(a.products.reduce((sum,p) => sum + p.revenue, 0)).toBe(99)
  })
  it('excludes uninterpretable legacy dates and keeps all chart group totals consistent', () => {
    const d = structuredClone(emptyData); d.sales = [sale(), sale({ date: 'أمس' }), sale({ date: '2026-02-30' }), sale({ date: '2026-09-30' })]
    for (const grouping of ['daily','weekly','monthly'] as const) {
      const a = calculateDashboard(d, range, today, grouping)
      expect(a.unknownDates).toBe(2)
      expect(a.points.reduce((s,p) => s + p.sales, 0)).toBe(10001)
    }
  })
})
describe('calendar ranges and preferences', () => {
  it('uses equal calendar days across month, year and leap-year boundaries', () => {
    expect(resolveRange('week', '2026-01-03', [])).toEqual({ from: '2025-12-28', to: '2026-01-03' })
    expect(resolveRange('previousMonth', '2024-03-15', [])).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(previousRange({ from: '2024-03-01', to: '2024-03-07' })).toEqual({ from: '2024-02-23', to: '2024-02-29' })
    expect(() => resolveRange('custom', today, [], { from: '2026-02-30', to: today })).toThrow()
    expect(() => resolveRange('custom', today, [], { from: today, to: '2026-01-01' })).toThrow()
    expect(() => resolveRange('fiscal', today, [])).toThrow()
  })
  it('validates persistent layouts and all business profiles', () => {
    for (const p of ['retail','grocery','parts','electronics','home','service'] as const) expect(validatePreferences(defaults(p))).toEqual(defaults(p))
    const p = defaults('grocery'); p.order.reverse(); p.hidden = ['expenses']; p.mode = 'advanced'; p.kpis = ['revenue']
    expect(validatePreferences(JSON.parse(JSON.stringify(p)))).toEqual(p)
    expect(() => validatePreferences({ ...p, order: ['sales','sales'] })).toThrow()
    expect(() => validatePreferences({ ...p, kpis: [] })).toThrow()
    expect(() => validatePreferences({ ...p, profile: '__proto__' })).toThrow()
  })
})
