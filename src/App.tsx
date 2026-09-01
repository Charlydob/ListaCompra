import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { AuthScreen } from './components/AuthScreen'
import { Dashboard } from './components/Dashboard'

export default function App() {
  const [user, setUser] = useState<User | null>(null); const [checking, setChecking] = useState(Boolean(auth))
  useEffect(() => auth ? onAuthStateChanged(auth, (next) => { setUser(next); setChecking(false) }) : undefined, [])
  if (checking) return <main className="loading">Cargando…</main>
  return user ? <Dashboard user={user} /> : <AuthScreen />
}
