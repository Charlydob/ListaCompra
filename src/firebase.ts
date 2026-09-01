import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const keys = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'] as const
const config = Object.fromEntries(keys.map((key) => {
  const camel = key.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
  return [camel, import.meta.env[`VITE_FIREBASE_${key}`]]
}))

export const firebaseConfigured = keys.every((key) => Boolean(import.meta.env[`VITE_FIREBASE_${key}`]))
let app: FirebaseApp | undefined
export let auth: Auth | undefined
export let db: Firestore | undefined

if (firebaseConfigured) {
  app = initializeApp(config)
  auth = getAuth(app)
  db = getFirestore(app)
}
