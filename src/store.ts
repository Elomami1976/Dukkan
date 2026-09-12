import { create } from 'zustand'
import type { Business, Product, Customer, Sale, SaleLine, AppUser, Purchase, Payment } from './types'
import { emptyData, validateData, businessData, parseBackup, type Data } from './lib/data'
import { credentials, verifyPassword } from './lib/auth'

const storageKey = 'dukkan-local-db-v1'
const id = (prefix: string) => prefix + '-' + crypto.randomUUID()
const now = () => new Date().toISOString()
const required = (s: string) => { if (!s.trim()) throw new Error('أكمل البيانات المطلوبة'); return s.trim() }
const amount = (n: number) => { if (!Number.isSafeInteger(n) || n < 0) throw new Error('المبلغ أو الكمية غير صالح'); return n }
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date
type PersonInput = Pick<Customer, 'name' | 'phone' | 'city'>
type State = Data & {
  sessionId: string | null; loadError: string
  completeSetup: (business: Business, user: { name: string; username: string; password: string }) => Promise<void>
  createAdmin: (name: string, username: string, password: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>; logout: () => void
  addUser: (name: string, username: string, password: string, role: AppUser['role']) => Promise<void>
  toggleUser: (userId: string) => void
  addProduct: (product: Omit<Product, 'id' | 'sku'> & { sku?: string }) => void
  editProduct: (product: Product) => void
  addCustomer: (person: PersonInput) => void; addSupplier: (person: PersonInput) => void
  addExpense: (expense: { category: string; note: string; amount: number; date?: string }) => void
  completeSale: (cart: { productId: string; qty: number }[], paid: number, customerId: string, method: string, discount: number) => Sale
  completePurchase: (supplierId: string, cart: { productId: string; qty: number; cost: number }[], paid: number, date: string, note: string) => Purchase
  recordPayment: (kind: Payment['kind'], partyId: string, amount: number, note: string) => void
  updateBusiness: (business: Partial<Business>) => void
  adjustStock: (productId: string, change: number, reason: string) => void
  restoreBackup: (text: string) => void; backup: () => string; markBackup: () => void
}
let loadError = ''
function load(): Data {
  try {
    if (typeof localStorage === 'undefined') return structuredClone(emptyData)
    const stored = localStorage.getItem(storageKey)
    return stored ? validateData(JSON.parse(stored).state) : structuredClone(emptyData)
  } catch { loadError = 'تعذر قراءة البيانات المحفوظة. لم يتم حذفها أو استبدالها. احتفظ بنسخة من بيانات المتصفح.'; return structuredClone(emptyData) }
}
const initial = load()
export const useAppStore = create<State>()((set, get) => {
  const snapshot = (): Data => Object.fromEntries(Object.keys(emptyData).map(key => [key, get()[key as keyof Data]])) as Data
  // Persist the complete transaction before publishing it to the UI.
  const commit = (changes: Partial<Data>) => {
    if (get().loadError) throw new Error(get().loadError)
    const data = validateData({ ...snapshot(), ...changes })
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify({ state: data, version: 0 })) }
    catch { throw new Error('تعذر حفظ البيانات على الجهاز. لم تسجل العملية؛ تحقق من مساحة التخزين.') }
    set(data)
  }
  const access = (admin = false) => {
    const user = get().users.find(u => u.id === get().sessionId && u.active)
    if (!user || (admin && user.role !== 'admin')) throw new Error('ليست لديك صلاحية لهذه العملية')
    return user
  }
  const newUser = async (name: string, username: string, password: string, role: AppUser['role']): Promise<AppUser> => {
    name = required(name); username = required(username)
    if (get().users.some(u => u.username.toLowerCase() === username.toLowerCase())) throw new Error('اسم المستخدم موجود بالفعل')
    return { id: id('USR'), name, username, role, active: true, ...await credentials(password) }
  }
  return {
    ...initial, loadError, sessionId: null,
    completeSetup: async (business, input) => {
      if (get().setupComplete || get().users.length) throw new Error('تم إعداد النشاط بالفعل')
      required(business.name)
      const user = await newUser(input.name, input.username, input.password, 'admin')
      if (get().setupComplete) throw new Error('تم إعداد النشاط بالفعل')
      commit({ business: businessData(business), users: [user], activeUser: user.name, setupComplete: true })
      set({ sessionId: user.id })
    },
    createAdmin: async (name, username, password) => {
      if (get().users.length || !get().setupComplete) throw new Error('تم إنشاء حساب المدير بالفعل')
      const user = await newUser(name, username, password, 'admin')
      if (get().users.length) throw new Error('تم إنشاء حساب المدير بالفعل')
      commit({ users: [user], activeUser: user.name }); set({ sessionId: user.id })
    },
    login: async (username, password) => {
      const user = get().users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.active)
      if (!user || !await verifyPassword(user, password)) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')
      if (!get().users.some(u => u.id === user.id && u.active && u.hash === user.hash)) throw new Error('الحساب غير متاح')
      set({ sessionId: user.id, activeUser: user.name })
    },
    logout: () => set({ sessionId: null }),
    addUser: async (name, username, password, role) => {
      access(true); const user = await newUser(name, username, password, role); access(true)
      if (get().users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) throw new Error('اسم المستخدم موجود بالفعل')
      commit({ users: [...get().users, user] })
    },
    toggleUser: userId => {
      const self = access(true)
      if (self.id === userId) throw new Error('لا يمكنك تعطيل حسابك الحالي')
      commit({ users: get().users.map(u => u.id === userId ? { ...u, active: !u.active } : u) })
    },
    addProduct: product => {
      access(true); required(product.name)
      const sku = product.sku?.trim() || id('PRD')
      if (get().products.some(p => p.sku === sku || (product.barcode && p.barcode === product.barcode))) throw new Error('رمز المنتج أو الباركود موجود بالفعل')
      const p: Product = { ...product, sku, id: id('P') }
      commit({ products: [...get().products, p], movements: p.trackInventory && p.stock ? [{ id: id('MOV'), productId: p.id, name: p.name, amount: p.stock, date: now(), reason: 'رصيد افتتاحي', balance: p.stock }, ...get().movements] : get().movements })
    },
    editProduct: product => {
      access(true); required(product.name)
      if (get().products.some(p => p.id !== product.id && (p.sku === product.sku || (product.barcode && p.barcode === product.barcode)))) throw new Error('رمز المنتج أو الباركود موجود بالفعل')
      const old = get().products.find(p => p.id === product.id)
      if (!old) throw new Error('المنتج غير موجود')
      commit({ products: get().products.map(p => p.id === product.id ? { ...product, stock: old.stock } : p) })
    },
    addCustomer: person => { access(); commit({ customers: [...get().customers, { ...person, name: required(person.name), id: id('C'), balance: 0, purchases: 0, lastPurchase: '' }] }) },
    addSupplier: person => { access(true); commit({ suppliers: [...get().suppliers, { ...person, name: required(person.name), id: id('S'), balance: 0, purchases: 0, lastPurchase: '' }] }) },
    addExpense: expense => { access(true); if (!amount(expense.amount)) throw new Error('أدخل مبلغاً أكبر من صفر'); if (expense.date && !validDate(expense.date)) throw new Error('التاريخ غير صالح'); commit({ expenses: [{ ...expense, id: id('EXP'), date: expense.date || now() }, ...get().expenses] }) },
    completeSale: (cart, paid, customerId, method, discount) => {
      const user = access(), state = get(); amount(paid); amount(discount)
      if (!cart.length) throw new Error('أضف منتجاً إلى السلة')
      if (!['نقدي', 'بطاقة', 'تحويل', 'صك'].includes(method)) throw new Error('طريقة الدفع غير صالحة')
      const quantities = new Map<string, number>()
      cart.forEach(l => { if (!amount(l.qty)) throw new Error('الكمية يجب أن تكون أكبر من صفر'); quantities.set(l.productId, amount((quantities.get(l.productId) || 0) + l.qty)) })
      const lines: SaleLine[] = Array.from(quantities, ([productId, qty]) => {
        const p = state.products.find(p => p.id === productId && p.status === 'active')
        if (!p) throw new Error('أحد المنتجات غير متاح')
        if (p.trackInventory && p.stock < qty) throw new Error('الكمية غير متوفرة: ' + p.name + '، المتاح ' + p.stock)
        return { productId, qty, name: p.name, price: p.price, cost: p.cost, unit: p.unit }
      })
      const subtotal = amount(lines.reduce((n, l) => n + l.qty * l.price, 0))
      if (discount > subtotal) throw new Error('الخصم أكبر من إجمالي الفاتورة')
      const total = subtotal - discount, customer = state.customers.find(c => c.id === customerId)
      if (customerId && !customer) throw new Error('العميل غير موجود')
      if (paid < total && !customer) throw new Error('اختر عميلاً للبيع الآجل')
      const date = now(), appliedPaid = Math.min(paid, total)
      const sale: Sale = { id: id('SAL'), customer: customer?.name || 'عميل نقدي', customerId, total, paid: appliedPaid, status: appliedPaid === total ? 'مدفوعة' : appliedPaid ? 'جزئية' : 'آجلة', date, cashier: user.name, items: lines.reduce((n, l) => n + l.qty, 0), lines, method, discount }
      const movements = [...state.movements]
      const products = state.products.map(p => {
        const qty = quantities.get(p.id)
        if (!qty || !p.trackInventory) return p
        const stock = p.stock - qty
        movements.unshift({ id: id('MOV'), productId: p.id, name: p.name, amount: -qty, date, reason: sale.id, balance: stock })
        return { ...p, stock }
      })
      commit({ sales: [sale, ...state.sales], products, movements, customers: state.customers.map(c => c.id === customerId ? { ...c, balance: amount(c.balance + total - appliedPaid), purchases: amount(c.purchases + total), lastPurchase: date } : c) })
      return sale
    },
    completePurchase: (supplierId, cart, paid, date, note) => {
      access(true); const state = get(), supplier = state.suppliers.find(s => s.id === supplierId)
      if (!supplier || !cart.length) throw new Error('اختر المورد وأضف الأصناف')
      if (!validDate(date)) throw new Error('التاريخ غير صالح')
      if (new Set(cart.map(l => l.productId)).size !== cart.length) throw new Error('المنتج مكرر في الفاتورة')
      const lines = cart.map(l => { const p = state.products.find(p => p.id === l.productId); if (!p || !p.trackInventory || !amount(l.qty)) throw new Error('الصنف أو الكمية غير صالح'); return { productId: p.id, name: p.name, unit: p.unit, qty: l.qty, cost: amount(l.cost), price: p.price } })
      const total = amount(lines.reduce((n, l) => n + l.qty * l.cost, 0)); amount(paid)
      if (paid > total) throw new Error('المدفوع أكبر من الإجمالي')
      const purchase: Purchase = { id: id('PUR'), supplierId, supplier: supplier.name, date, lines, total, paid, note }
      const movements = [...state.movements]
      const products = state.products.map(p => {
        const l = lines.find(l => l.productId === p.id); if (!l) return p
        const stock = amount(p.stock + l.qty), cost = Math.round((p.stock * p.cost + l.qty * l.cost) / stock)
        movements.unshift({ id: id('MOV'), productId: p.id, name: p.name, amount: l.qty, date, reason: purchase.id, balance: stock })
        return { ...p, stock, cost }
      })
      commit({ purchases: [purchase, ...state.purchases], products, movements, suppliers: state.suppliers.map(s => s.id === supplierId ? { ...s, balance: amount(s.balance + total - paid), purchases: amount(s.purchases + total), lastPurchase: date } : s) })
      return purchase
    },
    recordPayment: (kind, partyId, value, note) => {
      access(kind === 'supplier'); amount(value)
      const key = kind === 'customer' ? 'customers' : 'suppliers', party = get()[key].find(p => p.id === partyId)
      if (!party || !value || value > party.balance) throw new Error('الدفعة يجب أن تكون أكبر من صفر ولا تتجاوز الرصيد')
      commit({ [key]: get()[key].map(p => p.id === partyId ? { ...p, balance: p.balance - value } : p), payments: [{ id: id('PAY'), kind, partyId, amount: value, date: now(), note }, ...get().payments] })
    },
    updateBusiness: business => { access(true); const merged = businessData({ ...get().business, ...business }); required(merged.name); commit({ business: merged }) },
    adjustStock: (productId, change, reason) => {
      access(true); const p = get().products.find(p => p.id === productId)
      if (!p || !p.trackInventory || !Number.isSafeInteger(change) || !change || p.stock + change < 0) throw new Error('التسوية غير صالحة أو تتجاوز المخزون')
      required(reason); const balance = amount(p.stock + change)
      commit({ products: get().products.map(p => p.id === productId ? { ...p, stock: balance } : p), movements: [{ id: id('MOV'), productId, name: p.name, amount: change, date: now(), reason, balance }, ...get().movements] })
    },
    restoreBackup: text => { access(true); const restored = parseBackup(text); commit({ ...restored, setupComplete: true, users: get().users, activeUser: get().activeUser }) },
    backup: () => { access(true); const { users: _users, ...data } = snapshot(); return JSON.stringify({ format: 'Dukkan Backup', version: 2, exportedAt: now(), data }, null, 2) },
    markBackup: () => { access(true); commit({ lastBackup: now() }) },
  }
})
export const isAdmin = () => useAppStore.getState().users.some(u => u.id === useAppStore.getState().sessionId && u.role === 'admin' && u.active)
