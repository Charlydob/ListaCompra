import { parseISO } from 'date-fns'
import { getHolidayName } from '../config/holidays'
import { SALARY_RATES, type ResidencyYear } from '../config/salaryRates'

export type GuardType = 'Laborable' | 'Sábado' | 'Domingo/festivo' | 'Festivo especial'
export interface GuardDetail { date: string; type: GuardType; amount: number; holidayName?: string }
export interface SalaryCalculation { details: GuardDetail[]; guardPayments: number; grossSalary: number; irpfAmount: number; estimatedAfterIrpf: number }

export function classifyGuard(date: string, specialHolidays: string[] = []): { type: GuardType; holidayName?: string } {
  if (specialHolidays.includes(date)) return { type: 'Festivo especial' }
  const holidayName = getHolidayName(date)
  if (holidayName) return { type: 'Domingo/festivo', holidayName }
  const day = parseISO(date).getDay()
  if (day === 0) return { type: 'Domingo/festivo' }
  if (day === 6) return { type: 'Sábado' }
  return { type: 'Laborable' }
}

export function calculateSalary(year: ResidencyYear, baseSalary: number, irpf: number, guards: string[], specialHolidays: string[] = []): SalaryCalculation {
  const rates = SALARY_RATES[year]
  const details = [...new Set(guards)].sort().map((date) => {
    const classification = classifyGuard(date, specialHolidays)
    const amount = classification.type === 'Festivo especial' ? rates.specialHoliday : classification.type === 'Domingo/festivo' ? rates.holiday : classification.type === 'Sábado' ? rates.saturday : rates.weekday
    return { date, ...classification, amount }
  })
  const guardPayments = details.reduce((sum, guard) => sum + guard.amount, 0)
  const grossSalary = baseSalary + guardPayments
  const irpfAmount = grossSalary * irpf / 100
  return { details, guardPayments, grossSalary, irpfAmount, estimatedAfterIrpf: grossSalary - irpfAmount }
}
