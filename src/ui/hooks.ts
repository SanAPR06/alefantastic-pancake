import { useLiveQuery } from 'dexie-react-hooks';
import { AJUSTES_POR_DEFECTO, hoy, sumarDias } from '../domain/calc';
import type { Ajustes, FechaISO, Periodo, Registro } from '../domain/types';
import { db } from '../data/db';

export function useAjustes(): Ajustes {
  return useLiveQuery(() => db.ajustes.get('ajustes'), []) ?? AJUSTES_POR_DEFECTO;
}

export function useRegistros(): Registro[] | undefined {
  return useLiveQuery(() => db.registros.orderBy('fecha').reverse().toArray(), []);
}

export function usePeriodos(): Periodo[] {
  return useLiveQuery(() => db.periodos.orderBy('hasta').reverse().toArray(), []) ?? [];
}

/** El periodo abierto empieza el día después del último periodo cerrado. */
export function inicioPeriodoAbierto(periodos: Periodo[], registros: Registro[] = []): FechaISO {
  const ultimo = periodos.reduce<FechaISO | null>((m, p) => (!m || p.hasta > m ? p.hasta : m), null);
  if (ultimo) return sumarDias(ultimo, 1);
  const primero = registros.reduce<FechaISO | null>((m, r) => (!m || r.fecha < m ? r.fecha : m), null);
  return primero && primero < hoy() ? primero : hoy();
}
