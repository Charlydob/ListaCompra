import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageRepository } from './localStorageRepository'

const values = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
} })

describe('LocalStorageRepository', () => {
  beforeEach(() => values.clear())
  it('conserva el perfil y las guardias entre instancias', async () => {
    const first = new LocalStorageRepository()
    await first.saveProfile({ residencyYear: 'R4', baseSalary: 2100, irpf: 17, specialHolidays: ['2026-12-24'] })
    await first.saveGuards('2026-09', ['2026-09-07'])
    const reloaded = new LocalStorageRepository()
    expect(await reloaded.loadProfile()).toMatchObject({ residencyYear: 'R4', irpf: 17 })
    expect(await reloaded.loadGuards('2026-09')).toEqual(['2026-09-07'])
  })
})
