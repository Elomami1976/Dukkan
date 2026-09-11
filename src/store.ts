import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Business, Customer, Expense, Product, Sale, Supplier } from './types'
import { parseMoney } from './lib/money'

const today = new Date().toLocaleDateString('ar-LY', { day: '2-digit', month: 'short' })

const starterProducts: Product[] = [
  { id: 'p1', name: 'زيت النخيل 1 لتر', sku: 'PRD-000001', barcode: '628100100001', category: 'مواد غذائية', unit: 'قطعة', cost: 8500, price: 10500, wholesalePrice: 9800, stock: 84, minStock: 20, trackInventory: true, status: 'active' },
  { id: 'p2', name: 'أرز بسمتي 5 كجم', sku: 'PRD-000002', barcode: '628100100002', category: 'مواد غذائية', unit: 'كيس', cost: 22000, price: 28500, wholesalePrice: 26000, stock: 32, minStock: 10, trackInventory: true, status: 'active' },
  { id: 'p3', name: 'سكر أبيض 1 كجم', sku: 'PRD-000003', barcode: '628100100003', category: 'مواد غذائية', unit: 'كيس', cost: 3500, price: 4500, wholesalePrice: 4200, stock: 7, minStock: 15, trackInventory: true, status: 'active' },
  { id: 'p4', name: 'مياه معدنية 1.5 لتر', sku: 'PRD-000004', barcode: '628100100004', category: 'مشروبات', unit: 'كرتونة', cost: 12500, price: 16000, wholesalePrice: 14500, stock: 0, minStock: 8, trackInventory: true, status: 'active' },
  { id: 'p5', name: 'مناديل ورقية', sku: 'PRD-000005', barcode: '628100100005', category: 'منزلية', unit: 'علبة', cost: 2900, price: 4000, wholesalePrice: 3600, stock: 44, minStock: 10, trackInventory: true, status: 'active' },
  { id: 'p6', name: 'خدمة توصيل', sku: 'SRV-000001', category: 'خدمات', unit: 'خدمة', cost: 0, price: 1500, wholesalePrice: 1500, stock: 0, minStock: 0, trackInventory: false, status: 'active' },
]

const starterSales: Sale[] = [
  { id: 'SAL-000184', customer: 'عميل نقدي', total: 186500, paid: 186500, status: 'مدفوعة', date: 'اليوم، 10:42 ص', cashier: 'طارق', items: 4 },
  { id: 'SAL-000183', customer: 'مؤسسة الأمان', total: 420000, paid: 200000, status: 'جزئية', date: 'اليوم، 09:18 ص', cashier: 'طارق', items: 8 },
  { id: 'SAL-000182', customer: 'عميل نقدي', total: 73500, paid: 73500, status: 'مدفوعة', date: 'أمس، 06:50 م', cashier: 'طارق', items: 2 },
]

type AppState = {
  setupComplete: boolean
  business: Business
  products: Product[]
  customers: Customer[]
  suppliers: Supplier[]
  sales: Sale[]
  expenses: Expense[]
  categories: string[]
  activeUser: string
  completeSetup: (business: Business, user: string) => void
  addProduct: (product: Omit<Product, 'id' | 'sku'> & { sku?: string }) => void
  addCustomer: (customer: Omit<Customer, 'id' | 'balance' | 'purchases' | 'lastPurchase'>) => void
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void
  completeSale: (total: number, paid: number, customerName: string, items: number) => void
  updateBusiness: (business: Partial<Business>) => void
  adjustStock: (productId: string, amount: number) => void
}

export const useAppStore = create<AppState>()(persist((set) => ({
  setupComplete: false,
  business: { name: 'متجر البركة', type: 'متجر تجزئة', phone: '091-0000000', address: 'طرابلس، ليبيا', taxNumber: '', logo: '', primaryColor: '#d99a2b', currency: 'الدينار الليبي' },
  products: starterProducts,
  customers: [
    { id: 'c1', name: 'مؤسسة الأمان', phone: '091-2223344', city: 'طرابلس', balance: 350000, purchases: 2640000, lastPurchase: 'اليوم' },
    { id: 'c2', name: 'محمد الزوي', phone: '092-7744321', city: 'مصراتة', balance: 125000, purchases: 890000, lastPurchase: 'منذ يومين' },
    { id: 'c3', name: 'عميل نقدي', phone: '—', city: '—', balance: 0, purchases: 0, lastPurchase: '—' },
  ],
  suppliers: [
    { id: 's1', name: 'شركة النور للتوزيع', phone: '091-4445566', city: 'طرابلس', balance: 1280000, purchases: 7840000, lastPurchase: 'منذ 3 أيام' },
    { id: 's2', name: 'مصنع الربيع', phone: '092-1122334', city: 'مصراتة', balance: 440000, purchases: 3120000, lastPurchase: 'منذ أسبوع' },
  ],
  sales: starterSales,
  expenses: [
    { id: 'e1', category: 'نقل', note: 'توصيل بضاعة من المخزن', amount: 85000, date: 'اليوم' },
    { id: 'e2', category: 'كهرباء', note: 'فاتورة شهر سبتمبر', amount: 120000, date: '05 سبتمبر' },
    { id: 'e3', category: 'اتصالات', note: 'هاتف وإنترنت', amount: 45000, date: '02 سبتمبر' },
  ],
  categories: ['مواد غذائية', 'مشروبات', 'منزلية', 'خدمات', 'أخرى'],
  activeUser: 'طارق العمامي',
  completeSetup: (business, user) => set({ business, activeUser: user, setupComplete: true }),
  addProduct: (product) => set((state) => ({ products: [...state.products, { ...product, id: `p${Date.now()}`, sku: product.sku || `PRD-${String(state.products.length + 1).padStart(6, '0')}` }] })),
  addCustomer: (customer) => set((state) => ({ customers: [...state.customers, { ...customer, id: `c${Date.now()}`, balance: 0, purchases: 0, lastPurchase: '—' }] })),
  addExpense: (expense) => set((state) => ({ expenses: [{ ...expense, id: `e${Date.now()}`, date: today }, ...state.expenses] })),
  completeSale: (total, paid, customerName, items) => set((state) => {
    const status = paid >= total ? 'مدفوعة' : paid > 0 ? 'جزئية' : 'آجلة'
    const customer = state.customers.find((c) => c.name === customerName)
    return {
      sales: [{ id: `SAL-${String(state.sales.length + 185).padStart(6, '0')}`, customer: customerName || 'عميل نقدي', total, paid, status, date: 'الآن', cashier: state.activeUser, items }, ...state.sales],
      customers: customer && paid < total ? state.customers.map((c) => c.id === customer.id ? { ...c, balance: c.balance + total - paid, purchases: c.purchases + total, lastPurchase: 'الآن' } : c) : state.customers,
    }
  }),
  updateBusiness: (business) => set((state) => ({ business: { ...state.business, ...business } })),
  adjustStock: (productId, amount) => set((state) => ({ products: state.products.map((p) => p.id === productId ? { ...p, stock: Math.max(0, p.stock + amount) } : p) })),
}), { name: 'dukkan-local-db-v1' }))

export { parseMoney }
