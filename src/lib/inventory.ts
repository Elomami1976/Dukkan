import type { InventoryBatch, Product } from '../types'

export function productInventoryValue(product: Product, batches: InventoryBatch[]): number {
  if (!product.trackBatches) return product.stock * product.cost
  return batches.reduce((total, batch) => batch.productId === product.id ? total + batch.quantity * batch.unitCost : total, 0)
}

export function saleableStock(product: Product, batches: InventoryBatch[], today: string): number {
  if (!product.trackInventory) return Number.MAX_SAFE_INTEGER
  if (!product.trackBatches) return product.stock
  return batches.reduce((total, batch) => {
    if (batch.productId !== product.id || !batch.quantity) return total
    if (product.trackExpiry && (!batch.expiryDate || batch.expiryDate < today)) return total
    return total + batch.quantity
  }, 0)
}

export function inventoryMetrics(products: Product[], batches: InventoryBatch[], today: string): Map<string, { value: number; saleable: number }> {
  const productById = new Map(products.map(product => [product.id, product]))
  const metrics = new Map(products.map(product => [product.id, { value: product.trackBatches ? 0 : product.stock * product.cost, saleable: product.trackInventory ? (product.trackBatches ? 0 : product.stock) : Number.MAX_SAFE_INTEGER }]))
  for (const batch of batches) {
    const product = productById.get(batch.productId), metric = metrics.get(batch.productId)
    if (!product?.trackBatches || !metric) continue
    metric.value += batch.quantity * batch.unitCost
    if (!product.trackExpiry || Boolean(batch.expiryDate && batch.expiryDate >= today)) metric.saleable += batch.quantity
  }
  return metrics
}
