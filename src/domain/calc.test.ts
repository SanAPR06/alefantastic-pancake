import { describe, expect, it } from 'vitest';
import { calcularUnidades, cantidadRango, descripcionRango, nombrePeriodo, sumarDias } from './calc';

describe('calc', () => {
  it('genera el texto del rango de episodios', () => {
    expect(descripcionRango(1, 60)).toBe('del 1 al 60');
    expect(descripcionRango(2, 2)).toBe('Ep 2');
    expect(descripcionRango(2, 0)).toBe('Ep 2');
  });

  it('cuenta unidades como episodios × idiomas', () => {
    expect(calcularUnidades(cantidadRango(1, 60), ['eng', 'spa'])).toBe(120);
    expect(calcularUnidades(cantidadRango(1, 20), ['spa'])).toBe(20);
    expect(calcularUnidades(1, [])).toBe(1);
  });

  it('nombra el periodo por meses', () => {
    expect(nombrePeriodo('2026-06-01', '2026-08-31')).toBe('Junio-Agosto');
    expect(nombrePeriodo('2026-05-01', '2026-05-31')).toBe('Mayo');
    expect(nombrePeriodo('2025-12-01', '2026-01-15')).toBe('Diciembre 2025-Enero 2026');
  });

  it('suma días cruzando meses', () => {
    expect(sumarDias('2026-08-31', 1)).toBe('2026-09-01');
  });
});
