import { describe, expect, it } from 'vitest'
import { calculateSalary, classifyGuard } from './calculateSalary'

describe('clasificación de guardias', () => {
  it.each([['lunes', '2026-09-07'], ['viernes', '2026-09-04']])('clasifica %s normal', (_, date) => expect(classifyGuard(date).type).toBe('Laborable'))
  it('clasifica sábado', () => expect(classifyGuard('2026-09-12').type).toBe('Sábado'))
  it('clasifica domingo', () => expect(classifyGuard('2026-09-13').type).toBe('Domingo/festivo'))
  it('clasifica festivo entre semana', () => expect(classifyGuard('2026-10-09').type).toBe('Domingo/festivo'))
  it('prioriza festivo si cae sábado', () => expect(classifyGuard('2026-08-15').type).toBe('Domingo/festivo'))
  it('prioriza festivo especial', () => expect(classifyGuard('2026-08-15', ['2026-08-15']).type).toBe('Festivo especial'))
})

describe('cálculo salarial', () => {
  it.each([['R1', 236.30], ['R3', 322.15], ['R5', 365.16]] as const)('aplica la tarifa %s', (year, amount) => expect(calculateSalary(year, 0, 0, ['2026-09-07']).guardPayments).toBe(amount))
  it('calcula IRPF', () => expect(calculateSalary('R1', 1000, 15, []).estimatedAfterIrpf).toBe(850))
  it('suma varias guardias', () => expect(calculateSalary('R3', 1769.55, 15, ['2026-09-07', '2026-09-12', '2026-09-13']).guardPayments).toBeCloseTo(1181.10))
})
