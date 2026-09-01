import type { Profile } from '../../types'

export interface GuardDataRepository {
  loadProfile(): Promise<Profile>
  saveProfile(profile: Profile): Promise<void>
  loadGuards(month: string): Promise<string[]>
  saveGuards(month: string, guards: string[]): Promise<void>
}
