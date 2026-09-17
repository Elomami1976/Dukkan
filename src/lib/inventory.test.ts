import { describe, expect, it } from 'vitest'
import { productInventoryValue, saleableStock } from './inventory'
import type { InventoryBatch, Product } from '../types'

const product: Product = { id: 'p1', name: 'Milk', sku: 'M', category: 'Food', unit: 'Bottle', cost: 1000, price: 2000, wholesalePrice: 1500, stock: 5, minStock: 1, trackInventory: true, trackBatches: true, trackExpiry: true, expiryWarningDays: 30, status: 'active' }
const batches: InventoryBatch[] = [
  { id: 'b1', productId: 'p1', lotNumber: 'OLD', quantity: 2, expiryDate: '2020-01-01', unitCost: 700, supplierId: 's1', purchaseId: 'pur1', createdAt: '2020-01-01T00:00:00Z' },
  { id: 'b2', productId: 'p1', lotNumber: 'NEW', quantity: 3, expiryDate: '2099-01-01', unitCost: 1300, supplierId: 's1', purchaseId: 'pur2', createdAt: '2020-01-02T00:00:00Z' },
]

describe('batch inventory calculations', () => {
  it('values each batch using its retained historical cost', () => {
    expect(productInventoryValue(product, batches)).toBe(5300)
  })

  it('excludes expired batches from saleable stock', () => {
    expect(saleableStock(product, batches, '2026-01-01')).toBe(3)
  })
})
