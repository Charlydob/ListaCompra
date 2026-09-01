import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { defaultProfile, type Profile } from '../types'

const requireDb = () => { if (!db) throw new Error('Firebase no está configurado'); return db }

export async function loadProfile(uid: string): Promise<Profile> {
  const ref = doc(requireDb(), 'users', uid, 'profile', 'settings')
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    await setDoc(ref, { ...defaultProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    return defaultProfile
  }
  const data = snapshot.data()
  return { residencyYear: data.residencyYear, baseSalary: data.baseSalary, irpf: data.irpf, specialHolidays: data.specialHolidays ?? [] }
}

export async function saveProfile(uid: string, profile: Profile) {
  await setDoc(doc(requireDb(), 'users', uid, 'profile', 'settings'), { ...profile, updatedAt: serverTimestamp() }, { merge: true })
}

export async function loadGuards(uid: string, month: string): Promise<string[]> {
  const snapshot = await getDoc(doc(requireDb(), 'users', uid, 'months', month))
  return snapshot.exists() ? snapshot.data().guards ?? [] : []
}

export async function saveGuards(uid: string, month: string, guards: string[]) {
  await setDoc(doc(requireDb(), 'users', uid, 'months', month), { guards, updatedAt: serverTimestamp() })
}
