import Dexie, { type Table } from 'dexie';
import { AJUSTES_POR_DEFECTO } from '../domain/calc';
import type { Ajustes, Periodo, Registro } from '../domain/types';

/**
 * Almacenamiento local en el navegador (IndexedDB).
 * Todo el acceso a datos pasa por este módulo para que en la fase 3 (login / varios
 * empleados) se pueda cambiar por un backend sin tocar las pantallas.
 */
class BaseDatos extends Dexie {
  registros!: Table<Registro, string>;
  periodos!: Table<Periodo, string>;
  ajustes!: Table<Ajustes, string>;

  constructor() {
    super('registro-trabajo');
    this.version(1).stores({
      registros: 'id, fecha, categoria, programa',
      periodos: 'id, hasta',
      ajustes: 'id',
    });
  }
}

export const db = new BaseDatos();

export async function leerAjustes(): Promise<Ajustes> {
  return (await db.ajustes.get('ajustes')) ?? AJUSTES_POR_DEFECTO;
}

export async function guardarAjustes(a: Ajustes): Promise<void> {
  await db.ajustes.put(a);
}

export async function guardarRegistro(r: Registro): Promise<void> {
  await db.registros.put(r);
}

export async function borrarRegistro(id: string): Promise<void> {
  await db.registros.delete(id);
}

export async function guardarPeriodo(p: Periodo): Promise<void> {
  await db.periodos.put(p);
}

export async function borrarPeriodo(id: string): Promise<void> {
  await db.periodos.delete(id);
}

/** Pide al navegador que no borre los datos automáticamente. */
export async function pedirPersistencia(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* no soportado */
  }
}

export interface Respaldo {
  version: 1;
  exportadoEn: string;
  registros: Registro[];
  periodos: Periodo[];
  ajustes: Ajustes;
}

export async function crearRespaldo(): Promise<Respaldo> {
  return {
    version: 1,
    exportadoEn: new Date().toISOString(),
    registros: await db.registros.toArray(),
    periodos: await db.periodos.toArray(),
    ajustes: await leerAjustes(),
  };
}

/** Reemplaza todos los datos por los del respaldo. */
export async function restaurarRespaldo(r: Respaldo): Promise<void> {
  if (r.version !== 1 || !Array.isArray(r.registros)) throw new Error('Archivo de respaldo no válido');
  await db.transaction('rw', db.registros, db.periodos, db.ajustes, async () => {
    await db.registros.clear();
    await db.periodos.clear();
    await db.registros.bulkPut(r.registros);
    await db.periodos.bulkPut(r.periodos ?? []);
    if (r.ajustes) await db.ajustes.put({ ...r.ajustes, id: 'ajustes' });
  });
}
