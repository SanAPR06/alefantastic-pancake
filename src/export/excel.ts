import ExcelJS from 'exceljs';
import type { Ajustes, Registro } from '../domain/types';
import { descargarBlob } from './descargar';

/** Un periodo a exportar: genera una hoja "Subtitulos <nombre>" y un bloque en "Comentarios". */
export interface BloquePeriodo {
  nombre: string;
  registros: Registro[];
}

const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};
const CENTRO: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
const AMARILLO: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

function formatoDinero(n: number): string {
  return Number.isInteger(n) ? '"$"#,##0' : '"$"#,##0.00';
}

function celda(
  hoja: ExcelJS.Worksheet,
  ref: string,
  valor: ExcelJS.CellValue,
  opciones: { negrita?: boolean; dinero?: boolean; centrado?: boolean; formatoNum?: string } = {},
) {
  const c = hoja.getCell(ref);
  c.value = valor;
  c.border = BORDE;
  c.font = { name: 'Arial', size: 11, bold: opciones.negrita };
  if (opciones.centrado !== false) c.alignment = CENTRO;
  if (opciones.formatoNum) c.numFmt = opciones.formatoNum;
  if (opciones.dinero) {
    const n = typeof valor === 'number' ? valor : ((valor as ExcelJS.CellFormulaValue)?.result as number) ?? 0;
    c.numFmt = formatoDinero(n);
  }
  return c;
}

/** Nombres de hoja de Excel: máx. 31 caracteres y sin []:*?/\ */
function nombreHoja(nombre: string, usados: Set<string>): string {
  const base = nombre.replace(/[[\]:*?/\\]/g, '-').slice(0, 31);
  let n = base;
  for (let i = 2; usados.has(n.toLowerCase()); i++) n = `${base.slice(0, 28)} ${i}`;
  usados.add(n.toLowerCase());
  return n;
}

function porFecha(a: Registro, b: Registro) {
  return a.fecha.localeCompare(b.fecha) || a.creadoEn - b.creadoEn;
}

function horasTexto(h: number): string {
  return `${h} ${h === 1 ? 'hora' : 'horas'}`;
}

function hojaSubtitulos(hoja: ExcelJS.Worksheet, registros: Registro[], ajustes: Ajustes) {
  // La jefa pone el "Price Per episode"; solo se rellena si se activa en Ajustes (uso interno).
  const conPrecio = ajustes.precioEnExcel === true;
  const precioDe = (r: Registro) => (conPrecio ? r.precioUnitario : 0);
  hoja.columns = [
    { width: 26 }, { width: 22 }, { width: 16 }, { width: 14 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 4 }, { width: 30 },
  ];
  const encabezados = ['Programa', 'Episodio', 'Subtitulos ENG ', 'Subtitulos SPA', 'Number of eps', 'Price Per episode', 'Total'];
  encabezados.forEach((t, i) => celda(hoja, `${'ABCDEFG'[i]}1`, t, { negrita: true }));
  hoja.getRow(1).height = 32;

  const ordenados = [...registros].sort(porFecha);
  const subtitulos = ordenados.filter((r) => r.categoria === 'subtitulos');
  const metadata = ordenados.filter((r) => r.categoria === 'metadata');
  const presentaciones = ordenados.filter((r) => r.categoria === 'presentacion');
  const presentacionesConPrecio = presentaciones.filter((r) => r.precioUnitario > 0);
  const horas = ordenados.filter((r) => r.categoria === 'horas');

  let fila = 2;
  for (const r of subtitulos) {
    const eng = r.idiomas.includes('eng_cc') ? 'ENG CC' : r.idiomas.includes('eng') ? 'eng' : null;
    const spa = r.idiomas.includes('spa') ? 'spa' : null;
    celda(hoja, `A${fila}`, r.programa);
    celda(hoja, `B${fila}`, r.descripcion);
    celda(hoja, `C${fila}`, eng);
    celda(hoja, `D${fila}`, spa);
    celda(hoja, `E${fila}`, r.unidades);
    celda(hoja, `F${fila}`, conPrecio ? r.precioUnitario : null, { dinero: true });
    celda(hoja, `G${fila}`, { formula: `E${fila}*F${fila}`, result: r.unidades * precioDe(r) }, { dinero: true });
    fila++;
  }

  // Presentaciones sin precio: lista en la columna I, como en el Excel original.
  const listaPresentaciones = presentaciones.filter((r) => !(r.precioUnitario > 0));
  if (listaPresentaciones.length) {
    celda(hoja, 'I1', 'Presentaciones', { negrita: true });
    listaPresentaciones.forEach((r, i) => celda(hoja, `I${i + 2}`, r.programa));
  }

  const filasMonto = [
    ...metadata.map((r) => ({ a: 'Metadata', b: r.programa, monto: r.precioUnitario })),
    ...presentacionesConPrecio.map((r) => ({ a: 'Presentación', b: r.programa, monto: r.precioUnitario })),
  ];
  if (filasMonto.length) {
    fila++;
    for (const m of filasMonto) {
      celda(hoja, `A${fila}`, m.a, { centrado: false });
      celda(hoja, `B${fila}`, m.b, { centrado: false });
      celda(hoja, `G${fila}`, m.monto, { dinero: true });
      fila++;
    }
  }

  // Horas agrupadas por actividad (normalmente solo "Comentarios").
  const porActividad = new Map<string, number>();
  for (const r of horas) porActividad.set(r.programa, (porActividad.get(r.programa) ?? 0) + (r.horas ?? 0));
  if (porActividad.size) {
    fila++;
    for (const [actividad, h] of porActividad) {
      celda(hoja, `A${fila}`, actividad, { centrado: false });
      celda(hoja, `E${fila}`, horasTexto(h));
      celda(hoja, `F${fila}`, ajustes.tarifaHora, { dinero: true });
      celda(hoja, `G${fila}`, { formula: `${h}*F${fila}`, result: h * ajustes.tarifaHora }, { dinero: true });
      fila++;
    }
  }

  fila++;
  const ultima = fila - 1;
  const total =
    subtitulos.reduce((s, r) => s + r.unidades * precioDe(r), 0) +
    filasMonto.reduce((s, m) => s + m.monto, 0) +
    [...porActividad.values()].reduce((s, h) => s + h * ajustes.tarifaHora, 0);
  celda(hoja, `F${fila}`, 'TOTAL', { negrita: true });
  celda(hoja, `G${fila}`, { formula: `SUM(G2:G${ultima})`, result: total }, { dinero: true, negrita: true });
  return total;
}

function columna(n: number): string {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Hoja "Comentarios": un bloque Fecha | horas por periodo, uno al lado del otro. */
function hojaHoras(hoja: ExcelJS.Worksheet, bloques: BloquePeriodo[]) {
  bloques.forEach((b, i) => {
    const cf = columna(i * 3 + 1);
    const ch = columna(i * 3 + 2);
    hoja.getColumn(i * 3 + 1).width = 13;
    hoja.getColumn(i * 3 + 2).width = 10;
    hoja.getColumn(i * 3 + 3).width = 4;

    const titulo = hoja.getCell(`${cf}1`);
    titulo.value = b.nombre;
    titulo.font = { name: 'Arial', bold: true };
    titulo.fill = AMARILLO;
    titulo.alignment = { horizontal: 'center' };
    hoja.getCell(`${ch}1`).fill = AMARILLO;

    celda(hoja, `${cf}2`, 'Fecha', { negrita: true });
    celda(hoja, `${ch}2`, 'horas', { negrita: true });

    const porDia = new Map<string, number>();
    for (const r of b.registros) {
      if (r.categoria !== 'horas') continue;
      porDia.set(r.fecha, (porDia.get(r.fecha) ?? 0) + (r.horas ?? 0));
    }
    const dias = [...porDia.keys()].sort();
    let fila = 3;
    for (const d of dias) {
      const [a, m, dia] = d.split('-').map(Number);
      celda(hoja, `${cf}${fila}`, new Date(Date.UTC(a, m - 1, dia)), { formatoNum: 'dd-mm' });
      celda(hoja, `${ch}${fila}`, porDia.get(d)!);
      fila++;
    }
    const suma = [...porDia.values()].reduce((s, h) => s + h, 0);
    celda(hoja, `${cf}${fila}`, 'TOTAL', { negrita: true });
    celda(hoja, `${ch}${fila}`, dias.length ? { formula: `SUM(${ch}3:${ch}${fila - 1})`, result: suma } : 0, { negrita: true });
  });
}

export function construirLibro(bloques: BloquePeriodo[], ajustes: Ajustes): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = ajustes.nombreEmpleado || 'Registro de Trabajo';
  libro.created = new Date();
  const usados = new Set<string>(['comentarios']);
  for (const b of bloques) {
    const hoja = libro.addWorksheet(nombreHoja(`Subtitulos ${b.nombre}`, usados));
    hojaSubtitulos(hoja, b.registros, ajustes);
  }
  if (bloques.some((b) => b.registros.some((r) => r.categoria === 'horas'))) {
    hojaHoras(libro.addWorksheet(nombreHoja(ajustes.actividadHoras || 'Comentarios', new Set())), bloques);
  }
  return libro;
}

export async function descargarLibro(libro: ExcelJS.Workbook, nombreArchivo: string): Promise<void> {
  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  descargarBlob(blob, nombreArchivo);
}
