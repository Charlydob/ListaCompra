import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { AuthScreen } from './components/AuthScreen'
import { Dashboard } from './components/Dashboard'
import { FirebaseRepository } from './data/storage/firebaseRepository'
import { LocalStorageRepository } from './data/storage/localStorageRepository'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [local, setLocal] = useState(false)
  const repository = useMemo(() => local ? new LocalStorageRepository() : user ? new FirebaseRepository(user.uid) : null, [local, user])
  useEffect(() => auth ? onAuthStateChanged(auth, setUser, () => setUser(null)) : undefined, [])
  if (local && repository) return <Dashboard repository={repository} mode="local" onExit={() => setLocal(false)} />
  if (user && repository) return <Dashboard repository={repository} mode="firebase" onExit={() => auth && void auth.signOut()} />
  return <AuthScreen onUseLocal={() => setLocal(true)} />
}
