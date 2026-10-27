import { periods, type Period } from './dashboard'
export const widgets = { sales: 'أداء المبيعات', priorities: 'ما الذي يحتاج انتباهك اليوم؟', profitability: 'الإيرادات والتكلفة والربح', expenses: 'توزيع المصروفات', products: 'أداء المنتجات', inventory: 'نظرة على المخزون', insights: 'رؤى النشاط' }
export type Widget = keyof typeof widgets
export const kpis = { revenue: 'إجمالي المبيعات', grossProfit: 'مجمل الربح', receivables: 'مستحقات العملاء الآن', payables: 'مستحقات الموردين الآن', expenses: 'المصروفات التشغيلية', netResult: 'نتيجة التشغيل', inventoryValue: 'قيمة المخزون الآن', customerPayments: 'المقبوضات', supplierPayments: 'مدفوعات الموردين', losses: 'خسائر الإتلاف', invoiceCount: 'عدد الفواتير', average: 'متوسط الفاتورة' }
export type KPI = keyof typeof kpis
export const profiles = { retail: 'تجزئة عامة', grocery: 'مواد غذائية', parts: 'قطع غيار', electronics: 'إلكترونيات', home: 'مشروع منزلي', service: 'خدمات' }
export type Profile = keyof typeof profiles
export type DashboardPreferences = { version: 1; mode: 'simple' | 'advanced'; profile: Profile; period: Exclude<Period, 'custom'>; order: Widget[]; hidden: Widget[]; kpis: KPI[] }
const has = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key)
export function defaults(profile: Profile = 'retail'): DashboardPreferences {
  const order: Widget[] = profile === 'grocery' ? ['priorities','inventory','sales','expenses','profitability','products','insights'] : profile === 'parts' ? ['sales','products','inventory','profitability','priorities','expenses','insights'] : profile === 'home' || profile === 'service' ? ['sales','expenses','profitability','priorities','products','inventory','insights'] : ['sales','priorities','profitability','expenses','products','inventory','insights']
  const preferred: KPI[] = profile === 'electronics' ? ['revenue','inventoryValue','receivables','payables','grossProfit','customerPayments'] : profile === 'parts' ? ['revenue','grossProfit','inventoryValue','invoiceCount','expenses','netResult'] : profile === 'home' || profile === 'service' ? ['revenue','expenses','receivables','grossProfit','netResult','customerPayments'] : profile === 'grocery' ? ['revenue','grossProfit','inventoryValue','losses','receivables','payables'] : ['revenue','grossProfit','receivables','payables','expenses','netResult','inventoryValue','customerPayments']
  return { version: 1, mode: 'simple', profile, period: 'today', order, hidden: [], kpis: preferred }
}
export function validatePreferences(value: unknown): DashboardPreferences {
  const p = value as DashboardPreferences
  if (!p || p.version !== 1 || !['simple','advanced'].includes(p.mode) || !has(profiles, p.profile) || !has(periods, p.period) || (p.period as string) === 'custom') throw new Error('إعدادات لوحة التحكم غير صالحة')
  for (const [list, allowed] of [[p.order, widgets], [p.hidden, widgets], [p.kpis, kpis]] as const) if (!Array.isArray(list) || list.some(x => !has(allowed, x)) || new Set(list).size !== list.length) throw new Error('إعدادات لوحة التحكم غير صالحة')
  if (p.order.length !== Object.keys(widgets).length || !p.kpis.length) throw new Error('اختر مؤشراً واحداً على الأقل')
  return structuredClone(p)
}
