import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoney } from './money'

describe('LYD money utilities', () => {
  it('stores decimal dinars as integer minor units', () => {
    expect(parseMoney('12.500')).toBe(12500)
    expect(parseMoney('5,250')).toBe(5250000)
    expect(parseMoney('١٢٫٥٠٠')).toBe(12500)
  })

  it('formats with three decimal places', () => {
    expect(formatMoney(12500)).toContain('12.500')
    expect(formatMoney(12500)).toContain('د.ل')
  })

  it('rejects invalid amounts', () => {
    expect(() => parseMoney('not a number')).toThrow('InvalidAmount')
  })
})
