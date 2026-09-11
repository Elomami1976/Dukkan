export const CURRENCY = 'د.ل'
export const MINOR_UNITS = 1000

export function parseMoney(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * MINOR_UNITS)
  const normalized = value
    .replace(/[٬,\s]/g, '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace('٫', '.')
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('InvalidAmount')
  return Math.round(amount * MINOR_UNITS)
}

export function formatMoney(minor: number, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
    notation: compact ? 'compact' : 'standard'
  }).format(minor / MINOR_UNITS) + ' ' + CURRENCY
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-LY').format(value)
}
