import { useEffect, useMemo, useRef, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { signOut, type User } from 'firebase/auth'
import { auth } from '../firebase'
import { getHolidayName } from '../config/holidays'
import { calculateSalary } from '../domain/calculateSalary'
import { loadGuards, loadProfile, saveGuards, saveProfile } from '../services/userData'
import { defaultProfile, type Profile } from '../types'
import { Settings } from './Settings'

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
export function Dashboard({ user }: { user: User }) {
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [guards, setGuards] = useState<string[]>([])
  const [loading, setLoading] = useState(true); const [settings, setSettings] = useState(false); const [saveError, setSaveError] = useState('')
  const touchX = useRef(0); const monthKey = format(month, 'yyyy-MM')
  useEffect(() => { loadProfile(user.uid).then(setProfile).catch(() => setSaveError('No se pudo cargar el perfil.')).finally(() => setLoading(false)) }, [user.uid])
  useEffect(() => { setLoading(true); loadGuards(user.uid, monthKey).then(setGuards).catch(() => setSaveError('No se pudieron cargar las guardias.')).finally(() => setLoading(false)) }, [user.uid, monthKey])
  const calculation = useMemo(() => calculateSalary(profile.residencyYear, profile.baseSalary, profile.irpf, guards, profile.specialHolidays), [profile, guards])
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }); const padding = (getDay(startOfMonth(month)) + 6) % 7
  const toggle = async (date: string) => { const next = guards.includes(date) ? guards.filter((item) => item !== date) : [...guards, date].sort(); setGuards(next); setSaveError(''); try { await saveGuards(user.uid, monthKey, next) } catch { setGuards(guards); setSaveError('No se pudo guardar el cambio.') } }
  const persistProfile = async (next: Profile) => { await saveProfile(user.uid, next); setProfile(next) }
  if (loading && !profile) return <main className="loading">Cargando…</main>
  return <main className="app-shell" onTouchStart={(e) => { touchX.current = e.touches[0].clientX }} onTouchEnd={(e) => { const delta = e.changedTouches[0].clientX - touchX.current; if (Math.abs(delta) > 70) setMonth(delta < 0 ? addMonths(month, 1) : subMonths(month, 1)) }}>
    <nav><button className="settings-button" onClick={() => setSettings(true)}>⚙ Ajustes</button><button className="logout" onClick={() => auth && signOut(auth)}>Salir</button></nav>
    <header className="month-header"><button className="month-arrow" aria-label="Mes anterior" onClick={() => setMonth(subMonths(month, 1))}>‹</button><div><h1>{format(month, 'MMMM yyyy', { locale: es })}</h1><p>Salario esperado</p><strong>{money.format(calculation.estimatedAfterIrpf)}</strong><small>Neto estimado tras IRPF</small></div><button className="month-arrow" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}>›</button></header>
    <section className="summary"><div><span>Base</span><b>{money.format(profile.baseSalary)}</b></div><div><span>Guardias ({guards.length})</span><b>{money.format(calculation.guardPayments)}</b></div><div><span>IRPF estimado</span><b>−{money.format(calculation.irpfAmount)}</b></div></section>
    <section className="calendar-section"><h2>Marca los días en los que tienes guardia</h2><div className="weekdays">{['L','M','X','J','V','S','D'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">
      {Array.from({ length: padding }, (_, i) => <span key={`blank-${i}`} />)}
      {days.map((day) => { const date = format(day, 'yyyy-MM-dd'); const selected = guards.includes(date); const holiday = getHolidayName(date); const special = profile.specialHolidays.includes(date); return <button key={date} className={`day ${selected ? 'selected' : ''} ${holiday || special ? 'holiday' : ''}`} onClick={() => toggle(date)} aria-pressed={selected} aria-label={`${format(day, 'd MMMM', { locale: es })}${selected ? ', guardia marcada' : ''}${holiday ? `, ${holiday}` : ''}`}><span>{format(day, 'd')}</span>{selected && <b>G</b>}{(holiday || special) && <i title={special ? 'Festivo especial' : holiday}>•</i>}</button> })}
    </div><div className="legend"><span><i className="guard-dot" /> Guardia</span><span><i className="holiday-dot" /> Festivo</span></div></section>
    {saveError && <p className="error centered" role="alert">{saveError}</p>}
    <details className="breakdown"><summary>Ver desglose</summary>{calculation.details.length ? <><ul>{calculation.details.map((item) => <li key={item.date}><span><b>{format(new Date(`${item.date}T12:00:00`), 'd MMMM', { locale: es })}</b><small>{item.type}{item.holidayName ? ` · ${item.holidayName}` : ''}</small></span><strong>{money.format(item.amount)}</strong></li>)}</ul><div className="breakdown-total"><span>Total guardias</span><strong>{money.format(calculation.guardPayments)}</strong></div><div className="gross"><span>Bruto esperado del mes</span><strong>{money.format(calculation.grossSalary)}</strong></div></> : <p className="empty">Aún no has marcado ninguna guardia.</p>}</details>
    <p className="disclaimer">Estimación orientativa: no incluye cotizaciones a la Seguridad Social ni otros conceptos de nómina.</p>
    {settings && <Settings profile={profile} onSave={persistProfile} onClose={() => setSettings(false)} />}
  </main>
}
