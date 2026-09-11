export type Product = {
  id: string
  name: string
  sku: string
  barcode?: string
  category: string
  unit: string
  cost: number
  price: number
  wholesalePrice: number
  stock: number
  minStock: number
  trackInventory: boolean
  status: 'active' | 'inactive'
}

export type Customer = { id: string; name: string; phone: string; city: string; balance: number; purchases: number; lastPurchase: string }
export type Supplier = { id: string; name: string; phone: string; city: string; balance: number; purchases: number; lastPurchase: string }
export type Sale = { id: string; customer: string; total: number; paid: number; status: 'مدفوعة' | 'آجلة' | 'جزئية'; date: string; cashier: string; items: number }
export type Expense = { id: string; category: string; note: string; amount: number; date: string }

export type Business = {
  name: string
  type: string
  phone: string
  address: string
  taxNumber: string
  logo: string
  primaryColor: string
  currency: string
}
