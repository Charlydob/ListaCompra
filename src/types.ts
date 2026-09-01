import type { ResidencyYear } from './config/salaryRates'

export interface Profile {
  residencyYear: ResidencyYear
  baseSalary: number
  irpf: number
  specialHolidays: string[]
}

export const defaultProfile: Profile = { residencyYear: 'R1', baseSalary: 1501.84, irpf: 0, specialHolidays: [] }
