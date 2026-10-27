import { isAdmin, useAppStore } from '../store'
import { calculateDashboard, type DateRange } from './dashboard'
import { defaults, validatePreferences, type DashboardPreferences } from './dashboardPreferences'

function access() {
  if (!isAdmin()) throw new Error('لوحة التحليلات متاحة للمدير فقط')
  return useAppStore.getState()
}
export async function readDashboard(range: DateRange, today: string, grouping: 'daily' | 'weekly' | 'monthly') {
  const data = access()
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    const snapshot = await invoke<import('./data').Data>('dashboard_snapshot')
    access()
    return calculateDashboard(snapshot, range, today, grouping)
  }
  return calculateDashboard(data, range, today, grouping)
}
function key() { const s = access(); return 'dukkan-dashboard-v1:' + s.sessionId }
export function loadDashboardPreferences(): DashboardPreferences {
  const stored = localStorage.getItem(key())
  return stored ? validatePreferences(JSON.parse(stored)) : defaults()
}
export function saveDashboardPreferences(value: DashboardPreferences): DashboardPreferences {
  const storageKey = key(), next = validatePreferences(value)
  try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { throw new Error('تعذر حفظ تخصيص اللوحة محلياً. تحقق من مساحة التخزين.') }
  return next
}
