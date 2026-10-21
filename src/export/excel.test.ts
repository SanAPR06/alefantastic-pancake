import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { AJUSTES_POR_DEFECTO } from '../domain/calc';
import type { Idioma, Registro } from '../domain/types';
import { construirLibro } from './excel';

let n = 0;
function sub(programa: string, descripcion: string, idiomas: Idioma[], unidades: number, precio: number): Registro {
  return {
    id: String(++n), fecha: '2026-05-10', categoria: 'subtitulos', programa, descripcion,
    idiomas, unidades, precioUnitario: precio, creadoEn: n,
  };
}
function otro(categoria: Registro['categoria'], programa: string, monto: number, fecha = '2026-05-10', horas?: number): Registro {
  return {
    id: String(++n), fecha, categoria, programa, descripcion: '', idiomas: [], unidades: 1,
    precioUnitario: monto, horas, creadoEn: n,
  };
}

const ambos: Idioma[] = ['eng', 'spa'];

// Datos de la hoja "Subtitulos Abril-Mayo" del Excel original (total $1003).
const abrilMayo: Registro[] = [
  sub('La llorona', 'Trailer', ambos, 2, 5),
  sub('La llorona', 'Final trailer ', ambos, 4, 4),
  sub('La llorona', 'Trailer horizontal', ambos, 2, 4),
  sub('La llorona', 'del 1 al 60', ambos, 120, 2),
  sub('Jesus la ultima semana', 'Trailer', ambos, 2, 5),
  sub('Jesus la ultima semana', 'Trailer corto', ambos, 2, 4),
  sub('Jesus la ultima semana', 'Demo eng dubbed', ['eng'], 1, 5),
  sub('Maria y Jose eng dubbed', 'del 1 al 43', ['eng_cc'], 43, 2),
  sub('Playboy turco horizontal', 'The movie', ambos, 2, 20),
  sub('Una navidad complicada', 'del 1 al 19', ambos, 38, 2),
  sub("Angel Noah's tales", 'del 1 al 10', ambos, 20, 2),
  sub('Demo vip verticals 2026', 'trailer', ambos, 2, 5),
  sub('Encrucijada', 'del 1 al 20', ['spa'], 20, 15),
  sub('Maria y Jose horizontal', 'Ep 1', ambos, 2, 2),
  sub('La llorona horizontal', 'Ep 2', ambos, 2, 2),
  sub('Playboy turco horizontal', 'del 1 al 10', ambos, 20, 2),
  sub('Enredo en navidad horizontal', 'Compilado', ambos, 2, 15),
  otro('metadata', 'La Llorona', 30),
  otro('metadata', 'Angel Noah', 10),
  otro('presentacion', 'Presentación tiktok', 0),
  ...['2026-05-01', '2026-05-06', '2026-05-09', '2026-05-11', '2026-05-13', '2026-05-19', '2026-05-22', '2026-05-29']
    .map((f) => otro('horas', 'Comentarios', 0, f, 1)),
  otro('horas', 'Comentarios', 0, '2026-06-02', 0.5),
  otro('horas', 'Comentarios', 0, '2026-06-02', 0.5),
];

async function ida_y_vuelta(libro: ExcelJS.Workbook) {
  const buf = await libro.xlsx.writeBuffer();
  const leido = new ExcelJS.Workbook();
  await leido.xlsx.load(buf);
  return leido;
}

describe('construirLibro', () => {
  it('reproduce la hoja Abril-Mayo con el mismo total', async () => {
    const libro = await ida_y_vuelta(construirLibro([{ nombre: 'Abril-Mayo', registros: abrilMayo }], { ...AJUSTES_POR_DEFECTO, precioEnExcel: true }));
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Subtitulos Abril-Mayo', 'Comentarios']);

    const h = libro.getWorksheet('Subtitulos Abril-Mayo')!;
    expect(h.getRow(1).values).toEqual([
      undefined, 'Programa', 'Episodio', 'Subtitulos ENG ', 'Subtitulos SPA', 'Number of eps', 'Price Per episode', 'Total', undefined, 'Presentaciones',
    ]);
    expect(h.getCell('A5').value).toBe('La llorona');
    expect(h.getCell('B5').value).toBe('del 1 al 60');
    expect(h.getCell('E5').value).toBe(120);
    expect((h.getCell('G5').value as ExcelJS.CellFormulaValue).formula).toBe('E5*F5');
    expect(h.getCell('C9').value).toBe('ENG CC');
    expect(h.getCell('D9').value).toBeNull();
    expect(h.getCell('C14').value).toBeNull();
    expect(h.getCell('I2').value).toBe('Presentación tiktok');

    // Metadata después de una fila vacía
    expect(h.getCell('A20').value).toBe('Metadata');
    expect(h.getCell('G20').value).toBe(30);
    // Horas: 9 en total × $4
    expect(h.getCell('A23').value).toBe('Comentarios');
    expect(h.getCell('E23').value).toBe('9 horas');
    expect((h.getCell('G23').value as ExcelJS.CellFormulaValue).result).toBe(36);

    const total = h.getCell('G25').value as ExcelJS.CellFormulaValue;
    expect(total.formula).toBe('SUM(G2:G24)');
    expect(total.result).toBe(1003);

    const c = libro.getWorksheet('Comentarios')!;
    expect(c.getCell('A1').value).toBe('Abril-Mayo');
    expect(c.getCell('A2').value).toBe('Fecha');
    expect((c.getCell('A3').value as Date).toISOString().slice(0, 10)).toBe('2026-05-01');
    // dos registros de 0.5 el mismo día se juntan en una fila
    expect(c.getCell('B11').value).toBe(1);
    expect(c.getCell('A12').value).toBe('TOTAL');
    expect((c.getCell('B12').value as ExcelJS.CellFormulaValue).result).toBe(9);
  });

  it('deja vacío Price Per episode por defecto', async () => {
    const libro = await ida_y_vuelta(construirLibro([{ nombre: 'Abril-Mayo', registros: abrilMayo }], AJUSTES_POR_DEFECTO));
    const h = libro.getWorksheet('Subtitulos Abril-Mayo')!;
    expect(h.getCell('F2').value).toBeNull();
    expect(h.getCell('F18').value).toBeNull();
    expect((h.getCell('G5').value as ExcelJS.CellFormulaValue).formula).toBe('E5*F5');
    expect(h.getCell('E5').value).toBe(120);
  });

  it('pone varios periodos en hojas separadas y bloques lado a lado', async () => {
    const libro = await ida_y_vuelta(construirLibro(
      [
        { nombre: 'Abril-Mayo', registros: abrilMayo },
        { nombre: 'Junio-Agosto', registros: [otro('horas', 'Comentarios', 0, '2026-06-08', 2)] },
      ],
      AJUSTES_POR_DEFECTO,
    ));
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Subtitulos Abril-Mayo', 'Subtitulos Junio-Agosto', 'Comentarios']);
    const c = libro.getWorksheet('Comentarios')!;
    expect(c.getCell('D1').value).toBe('Junio-Agosto');
    expect(c.getCell('E3').value).toBe(2);
  });
});
