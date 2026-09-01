import { holidays2026, specialHolidays2026 } from './2026'

export const HOLIDAYS_BY_YEAR: Record<number, Record<string, string>> = { 2026: holidays2026 }
export const SPECIAL_HOLIDAYS_BY_YEAR: Record<number, string[]> = { 2026: specialHolidays2026 }

export const getHolidayName = (date: string) => HOLIDAYS_BY_YEAR[Number(date.slice(0, 4))]?.[date]
