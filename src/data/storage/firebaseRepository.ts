import { get, ref, set, update } from 'firebase/database'
import { database } from '../../firebase'
import { defaultProfile, type Profile } from '../../types'
import type { GuardDataRepository } from './repository'

export class FirebaseRepository implements GuardDataRepository {
  constructor(private readonly uid: string) {}
  private path(path: string) {
    if (!database) throw new Error('Firebase Realtime Database no está disponible')
    return ref(database, `guardSalaryApp/users/${this.uid}/${path}`)
  }
  async loadProfile(): Promise<Profile> {
    const snapshot = await get(this.path('profile'))
    return snapshot.exists() ? { ...defaultProfile, ...snapshot.val() } : { ...defaultProfile }
  }
  async saveProfile(profile: Profile) { await update(this.path('profile'), profile) }
  async loadGuards(month: string): Promise<string[]> {
    const snapshot = await get(this.path(`months/${month}/guards`))
    return snapshot.exists() ? snapshot.val() : []
  }
  async saveGuards(month: string, guards: string[]) { await set(this.path(`months/${month}/guards`), guards) }
}
