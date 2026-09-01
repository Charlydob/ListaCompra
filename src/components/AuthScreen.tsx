import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, firebaseConfigured } from '../firebase'

export function AuthScreen({ onUseLocal }: { onUseLocal: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!auth) return
    setBusy(true); setError('')
    try {
      if (registering) await createUserWithEmailAndPassword(auth, email, password)
      else await signInWithEmailAndPassword(auth, email, password)
    } catch (reason) { setError(reason instanceof Error ? humanizeError(reason.message) : 'No se pudo iniciar sesión.') }
    finally { setBusy(false) }
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="brand-mark">+</div><h1>Guardias médicas</h1><p className="muted">Tu salario esperado, sin complicaciones.</p>
    {!firebaseConfigured && <div className="config-warning"><strong>Firebase no está disponible.</strong><br />Puedes seguir usando la aplicación en modo local.</div>}
    <form onSubmit={submit}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Contraseña<input type="password" minLength={6} autoComplete={registering ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={!firebaseConfigured || busy}>{busy ? 'Espera…' : registering ? 'Crear cuenta' : 'Entrar'}</button>
    </form>
    <button className="secondary" type="button" onClick={onUseLocal}>Usar temporalmente sin cuenta</button>
    <button className="link-button" onClick={() => { setRegistering(!registering); setError('') }}>{registering ? 'Ya tengo una cuenta' : 'Crear cuenta'}</button>
  </section></main>
}

function humanizeError(message: string) {
  if (message.includes('invalid-credential')) return 'Email o contraseña incorrectos.'
  if (message.includes('email-already-in-use')) return 'Ya existe una cuenta con este email.'
  if (message.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.'
  return 'No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.'
}
