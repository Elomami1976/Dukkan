import type { Business, Product, Customer, Supplier, Sale, Expense, Purchase, StockMovement, Payment, AppUser } from '../types'

export type Data = {
  setupComplete: boolean; business: Business; products: Product[]; customers: Customer[]; suppliers: Supplier[]
  sales: Sale[]; expenses: Expense[]; categories: string[]; activeUser: string
  purchases: Purchase[]; movements: StockMovement[]; payments: Payment[]; users: AppUser[]; lastBackup: string
}
export const emptyData: Data = {
  setupComplete: false,
  business: { name: '', type: 'متجر تجزئة', phone: '', address: '', taxNumber: '', logo: '', primaryColor: '#d99a2b', currency: 'الدينار الليبي' },
  products: [], customers: [], suppliers: [], sales: [], expenses: [], purchases: [], movements: [], payments: [], users: [],
  categories: ['مواد غذائية', 'مشروبات', 'منزلية', 'خدمات', 'أخرى'], activeUser: '', lastBackup: '',
}
function invalid(): never { throw new Error('بيانات غير صالحة: لم يتم استبدال السجلات الحالية') }
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as Record<string, unknown>
}
function str(value: unknown, max = 10000): string { if (typeof value !== 'string' || value.length > max) return invalid(); return value }
function num(value: unknown, signed = false): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || (!signed && value < 0)) return invalid(); return value }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return invalid(); return value }
function list<T>(value: unknown, parse: (v: unknown) => T): T[] { if (!Array.isArray(value)) return invalid(); return value.map(parse) }
function records<T extends { id: string }>(value: unknown, parse: (v: unknown) => T): T[] {
  const result = list(value, parse)
  if (new Set(result.map(r => r.id)).size !== result.length || result.some(r => !r.id)) return invalid()
  return result
}
export function businessData(value: unknown): Business {
  const b = obj(value), logo = str(b.logo, 1000000), color = str(b.primaryColor)
  if (logo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)) return invalid()
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return invalid()
  return { name: str(b.name), type: str(b.type), phone: str(b.phone), address: str(b.address), taxNumber: str(b.taxNumber), logo, primaryColor: color, currency: str(b.currency) }
}
function party(value: unknown): Customer {
  const p = obj(value)
  return { id: str(p.id), name: str(p.name), phone: str(p.phone), city: str(p.city), balance: num(p.balance), purchases: num(p.purchases), lastPurchase: str(p.lastPurchase) }
}
function line(value: unknown) {
  const l = obj(value), qty = num(l.qty)
  if (!qty) return invalid()
  return { productId: str(l.productId), name: str(l.name), unit: str(l.unit), qty, price: num(l.price), cost: num(l.cost) }
}
export function validateData(value: unknown, includeUsers = true): Data {
  const d = obj(value)
  const result: Data = {
    setupComplete: bool(d.setupComplete), business: businessData(d.business), activeUser: str(d.activeUser),
    categories: list(d.categories, v => str(v)), lastBackup: d.lastBackup === undefined ? '' : str(d.lastBackup),
    products: records(d.products, v => { const p = obj(v); if (!['active', 'inactive'].includes(str(p.status))) return invalid(); return { id: str(p.id), name: str(p.name), sku: str(p.sku), ...(p.barcode === undefined ? {} : { barcode: str(p.barcode) }), category: str(p.category), unit: str(p.unit), cost: num(p.cost), price: num(p.price), wholesalePrice: num(p.wholesalePrice), stock: num(p.stock), minStock: num(p.minStock), trackInventory: bool(p.trackInventory), status: p.status as Product['status'] } }),
    customers: records(d.customers, party), suppliers: records(d.suppliers, party),
    sales: records(d.sales, v => {
      const s = obj(v), total = num(s.total), paid = num(s.paid)
      if (!['مدفوعة', 'آجلة', 'جزئية'].includes(str(s.status))) return invalid()
      const lines = s.lines === undefined ? undefined : list(s.lines, line)
      const discount = s.discount === undefined ? 0 : num(s.discount)
      if (lines && (lines.length === 0 || lines.reduce((n, l) => n + l.price * l.qty, 0) - discount !== total || lines.reduce((n, l) => n + l.qty, 0) !== num(s.items) || paid > total)) return invalid()
      return { id: str(s.id), customer: str(s.customer), total, paid, date: str(s.date), cashier: str(s.cashier), items: num(s.items), status: s.status as Sale['status'], ...(lines ? { lines, discount } : {}), ...(s.customerId === undefined ? {} : { customerId: str(s.customerId) }), ...(s.method === undefined ? {} : { method: str(s.method) }) }
    }),
    expenses: records(d.expenses, v => { const e = obj(v); return { id: str(e.id), category: str(e.category), note: str(e.note), amount: num(e.amount), date: str(e.date) } }),
    purchases: records(d.purchases ?? [], v => { const p = obj(v), lines = list(p.lines, line), total = num(p.total), paid = num(p.paid); if (!lines.length || total !== lines.reduce((n, l) => n + l.cost * l.qty, 0) || paid > total) return invalid(); return { id: str(p.id), supplierId: str(p.supplierId), supplier: str(p.supplier), date: str(p.date), total, paid, lines, note: str(p.note) } }),
    movements: records(d.movements ?? [], v => { const m = obj(v); return { id: str(m.id), productId: str(m.productId), name: str(m.name), amount: num(m.amount, true), balance: num(m.balance), date: str(m.date), reason: str(m.reason) } }),
    payments: records(d.payments ?? [], v => { const p = obj(v); if (!['customer', 'supplier'].includes(str(p.kind))) return invalid(); return { id: str(p.id), partyId: str(p.partyId), kind: p.kind as Payment['kind'], amount: num(p.amount), date: str(p.date), note: str(p.note) } }),
    users: includeUsers ? records(d.users ?? [], v => { const u = obj(v); if (!['admin', 'cashier'].includes(str(u.role)) || !/^[a-f0-9]{64}$/.test(str(u.hash)) || !/^[a-f0-9]{32}$/.test(str(u.salt))) return invalid(); return { id: str(u.id), username: str(u.username), name: str(u.name), role: u.role as AppUser['role'], active: bool(u.active), salt: str(u.salt), hash: str(u.hash) } }) : [],
  }
  if (result.users.length && !result.users.some(u => u.active && u.role === 'admin')) return invalid()
  if (new Set(result.users.map(u => u.username.toLowerCase())).size !== result.users.length) return invalid()
  return result
}

export function parseBackup(text: string): Data {
  const backup = obj(JSON.parse(text))
  if (backup.format !== 'Dukkan Backup' || (backup.version !== 1 && backup.version !== 2)) return invalid()
  return validateData(backup.data, false)
}
export function dayKey(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}(T|$)/.test(date) || !Number.isFinite(Date.parse(date))) return ''
  if (date.length === 10) return date
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const todayKey = () => dayKey(new Date().toISOString())
export const displayDate = (date: string) => {
  if (!dayKey(date)) return date || 'غير مسجل'
  const local = date.length === 10 ? new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) : new Date(date)
  return local.toLocaleDateString('ar-LY')
}
