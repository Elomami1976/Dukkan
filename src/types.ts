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
export type SaleLine = { productId: string; name: string; unit: string; qty: number; price: number; cost: number }
export type Sale = { id: string; customer: string; customerId?: string; total: number; paid: number; status: 'مدفوعة' | 'آجلة' | 'جزئية'; date: string; cashier: string; items: number; lines?: SaleLine[]; method?: string; discount?: number }
export type Purchase = { id: string; supplierId: string; supplier: string; date: string; total: number; paid: number; lines: SaleLine[]; note: string }
export type StockMovement = { id: string; productId: string; name: string; amount: number; date: string; reason: string; balance: number }
export type Payment = { id: string; partyId: string; kind: 'customer' | 'supplier'; amount: number; date: string; note: string }
export type AppUser = { id: string; name: string; username: string; salt: string; hash: string; role: 'admin' | 'cashier'; active: boolean }
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
