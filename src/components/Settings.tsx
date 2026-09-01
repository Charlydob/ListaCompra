import { useState, type FormEvent } from 'react'
import { SALARY_RATES, type ResidencyYear } from '../config/salaryRates'
import type { Profile } from '../types'

export function Settings({ profile, onSave, onClose }: { profile: Profile; onSave: (profile: Profile) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(profile); const [specialDate, setSpecialDate] = useState(''); const [saving, setSaving] = useState(false)
  const changeYear = (year: ResidencyYear) => setDraft({ ...draft, residencyYear: year, baseSalary: SALARY_RATES[year].baseSalary })
  const addSpecial = () => { if (specialDate && !draft.specialHolidays.includes(specialDate)) setDraft({ ...draft, specialHolidays: [...draft.specialHolidays, specialDate].sort() }); setSpecialDate('') }
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); onClose() }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <header><h2 id="settings-title">Ajustes</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button></header>
    <form onSubmit={submit}>
      <label>Año de residencia<select value={draft.residencyYear} onChange={(e) => changeYear(e.target.value as ResidencyYear)}>{Object.keys(SALARY_RATES).map((year) => <option key={year}>{year}</option>)}</select></label>
      <label>Salario base bruto mensual (€)<input type="number" min="0" step="0.01" required value={draft.baseSalary} onChange={(e) => setDraft({ ...draft, baseSalary: Number(e.target.value) })} /></label>
      <p className="field-help">La tarifa de {draft.residencyYear} se sugiere al cambiar el año, pero siempre puedes editarla.</p>
      <label>IRPF (%)<input type="number" min="0" max="100" step="0.01" required value={draft.irpf} onChange={(e) => setDraft({ ...draft, irpf: Number(e.target.value) })} /></label>
      <details className="advanced"><summary>Festivos especiales</summary><p className="field-help">Añade solo las fechas que Sanidad haya confirmado como guardia de festivo especial.</p><div className="date-add"><input aria-label="Fecha especial" type="date" value={specialDate} onChange={(e) => setSpecialDate(e.target.value)} /><button type="button" onClick={addSpecial}>Añadir</button></div>
        <div className="chips">{draft.specialHolidays.map((date) => <button type="button" key={date} title="Quitar fecha" onClick={() => setDraft({ ...draft, specialHolidays: draft.specialHolidays.filter((item) => item !== date) })}>{date} ×</button>)}</div>
      </details>
      <button className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ajustes'}</button>
    </form>
  </section></div>
}
