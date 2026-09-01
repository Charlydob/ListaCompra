import { defaultProfile, type Profile } from '../../types'
import type { GuardDataRepository } from './repository'

const PROFILE_KEY = 'guardSalaryApp.local.profile'
const MONTH_PREFIX = 'guardSalaryApp.local.month.'

export class LocalStorageRepository implements GuardDataRepository {
  async loadProfile(): Promise<Profile> {
    const stored = localStorage.getItem(PROFILE_KEY)
    return stored ? { ...defaultProfile, ...JSON.parse(stored) } : { ...defaultProfile }
  }
  async saveProfile(profile: Profile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) }
  async loadGuards(month: string): Promise<string[]> { return JSON.parse(localStorage.getItem(`${MONTH_PREFIX}${month}`) ?? '[]') }
  async saveGuards(month: string, guards: string[]) { localStorage.setItem(`${MONTH_PREFIX}${month}`, JSON.stringify(guards)) }
}
