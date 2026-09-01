export type ResidencyYear = 'R1' | 'R2' | 'R3' | 'R4' | 'R5'

export interface SalaryRate {
  baseSalary: number
  weekday: number
  saturday: number
  holiday: number
  specialHoliday: number
}

export const SALARY_RATES: Record<ResidencyYear, SalaryRate> = {
  R1: { baseSalary: 1501.84, weekday: 236.30, saturday: 270.30, holiday: 381.60, specialHoliday: 667.20 },
  R2: { baseSalary: 1621.87, weekday: 279.14, saturday: 313.14, holiday: 442.08, specialHoliday: 788.16 },
  R3: { baseSalary: 1769.55, weekday: 322.15, saturday: 356.15, holiday: 502.80, specialHoliday: 909.60 },
  R4: { baseSalary: 1917.23, weekday: 365.16, saturday: 399.16, holiday: 563.52, specialHoliday: 1031.04 },
  R5: { baseSalary: 2064.90, weekday: 365.16, saturday: 399.16, holiday: 563.52, specialHoliday: 1031.04 },
}
