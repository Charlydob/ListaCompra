import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

const historicalConfig = {
  apiKey: 'AIzaSyBDcOCQ0OrAaxr-yhhD5iVHqegwvhpjZaE', authDomain: 'listacompra-6d0b3.firebaseapp.com',
  databaseURL: 'https://listacompra-6d0b3-default-rtdb.europe-west1.firebasedatabase.app', projectId: 'listacompra-6d0b3',
  storageBucket: 'listacompra-6d0b3.appspot.com', messagingSenderId: '175496423309', appId: '1:175496423309:web:509b2eb64961245536bfc4',
}
const keys = ['API_KEY', 'AUTH_DOMAIN', 'DATABASE_URL', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'] as const
const environmentConfig = Object.fromEntries(keys.map((key) => {
  const camel = key.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
  return [camel, import.meta.env[`VITE_FIREBASE_${key}`]]
})) as Record<string, string | undefined>
const config = Object.fromEntries(Object.entries(historicalConfig).map(([key, fallback]) => [key, environmentConfig[key] || fallback]))

export let firebaseConfigured = true
export let firebaseError = ''
let app: FirebaseApp | undefined
export let auth: Auth | undefined
export let database: Database | undefined

try {
  app = initializeApp(config)
  auth = getAuth(app)
  database = getDatabase(app)
} catch (error) {
  firebaseConfigured = false
  firebaseError = error instanceof Error ? error.message : 'No se pudo inicializar Firebase.'
}
