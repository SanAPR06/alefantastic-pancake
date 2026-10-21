import type { Ajustes, FechaISO, Idioma, Registro, TipoTrabajo } from './types';

export const IDIOMAS: { id: Idioma; etiqueta: string }[] = [
  { id: 'eng', etiqueta: 'ENG' },
  { id: 'eng_cc', etiqueta: 'ENG CC' },
  { id: 'spa', etiqueta: 'SPA' },
];

/** Precios tomados del historial del Excel original. Se pueden editar en Ajustes. */
export const TIPOS_POR_DEFECTO: TipoTrabajo[] = [
  { id: 'episodios', nombre: 'Episodios', precio: 2, porRango: true },
  { id: 'trailer', nombre: 'Trailer', precio: 5, porRango: false },
  { id: 'trailer_corto', nombre: 'Trailer corto', precio: 4, porRango: false },
  { id: 'trailer_horizontal', nombre: 'Trailer horizontal', precio: 4, porRango: false },
  { id: 'final_trailer', nombre: 'Final trailer', precio: 4, porRango: false },
  { id: 'demo', nombre: 'Demo', precio: 5, porRango: false },
  { id: 'pelicula', nombre: 'Película', precio: 20, porRango: false },
  { id: 'compilado', nombre: 'Compilado', precio: 15, porRango: false },
  { id: 'otro', nombre: 'Otro', precio: 0, porRango: false },
];

export const AJUSTES_POR_DEFECTO: Ajustes = {
  id: 'ajustes',
  nombreEmpleado: '',
  tarifaHora: 4,
  actividadHoras: 'Comentarios',
  montoMetadata: 10,
  montoPresentacion: 20,
  tipos: TIPOS_POR_DEFECTO,
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function hoy(): FechaISO {
  return aISO(new Date());
}

export function aISO(d: Date): FechaISO {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [a, m, d] = fecha.split('-').map(Number);
  return aISO(new Date(a, m - 1, d + dias));
}

export function fechaCorta(fecha: FechaISO): string {
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}

/** "Junio-Agosto", "Mayo", o "Diciembre 2025-Enero 2026" si cambia el año. */
export function nombrePeriodo(desde: FechaISO, hasta: FechaISO): string {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  if (a1 === a2 && m1 === m2) return MESES[m1 - 1];
  if (a1 === a2) return `${MESES[m1 - 1]}-${MESES[m2 - 1]}`;
  return `${MESES[m1 - 1]} ${a1}-${MESES[m2 - 1]} ${a2}`;
}

/** Texto para la columna "Episodio" a partir de un rango. */
export function descripcionRango(desde: number, hasta: number): string {
  if (!hasta || hasta === desde) return `Ep ${desde}`;
  return `del ${desde} al ${hasta}`;
}

export function cantidadRango(desde: number, hasta: number): number {
  if (!desde) return 0;
  if (!hasta) return 1;
  return Math.max(0, hasta - desde + 1);
}

/** En el Excel "Number of eps" = episodios × idiomas (60 eps en eng+spa = 120). */
export function calcularUnidades(cantidad: number, idiomas: Idioma[]): number {
  return cantidad * Math.max(1, idiomas.length);
}

export function totalRegistro(r: Registro, ajustes: Pick<Ajustes, 'tarifaHora'>): number {
  if (r.categoria === 'horas') return (r.horas ?? 0) * ajustes.tarifaHora;
  if (r.categoria === 'subtitulos') return r.unidades * r.precioUnitario;
  return r.precioUnitario;
}

export function totalRegistros(rs: Registro[], ajustes: Pick<Ajustes, 'tarifaHora'>): number {
  return rs.reduce((s, r) => s + totalRegistro(r, ajustes), 0);
}

export function dinero(n: number): string {
  return '$' + n.toLocaleString('es', { maximumFractionDigits: 2 });
}

export function enRango(r: Registro, desde: FechaISO, hasta: FechaISO): boolean {
  return r.fecha >= desde && r.fecha <= hasta;
}

export function nuevoId(): string {
  return crypto.randomUUID();
}
