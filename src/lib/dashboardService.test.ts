import { beforeEach, expect, it, vi } from 'vitest'
import { useAppStore } from '../store'
import { emptyData } from './data'
import { defaults } from './dashboardPreferences'
import { loadDashboardPreferences, readDashboard, saveDashboardPreferences } from './dashboardService'
beforeEach(() => {
  const storage = new Map<string,string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value) })
  useAppStore.setState({ ...structuredClone(emptyData), sessionId: 'admin', users: [{ id: 'admin', name: '', username: '', hash: '', salt: '', role: 'admin', active: true }, { id: 'cashier', name: '', username: '', hash: '', salt: '', role: 'cashier', active: true }] })
})
it('guards reads and preference writes even when invoked outside the UI', async () => {
  for (const sessionId of ['cashier', null, 'unknown']) {
    useAppStore.setState({ sessionId })
    await expect(readDashboard({ from: '2026-10-01', to: '2026-10-01' }, '2026-10-01', 'daily')).rejects.toThrow('للمدير')
    expect(() => saveDashboardPreferences(defaults())).toThrow('للمدير')
    expect(() => loadDashboardPreferences()).toThrow('للمدير')
  }
})
it('saves layouts independently of financial data and rejects disabled admins', () => {
  const before = JSON.stringify(useAppStore.getState())
  const p = defaults('grocery'); p.mode = 'advanced'
  saveDashboardPreferences(p)
  expect(loadDashboardPreferences()).toEqual(p)
  expect(JSON.stringify(useAppStore.getState())).toBe(before)
  useAppStore.setState({ users: useAppStore.getState().users.map(u => ({ ...u, active: false })) })
  expect(() => loadDashboardPreferences()).toThrow()
})
