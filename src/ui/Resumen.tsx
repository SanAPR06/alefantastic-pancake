import { useEffect, useState } from 'react';
import { dinero, enRango, hoy, nombrePeriodo, nuevoId, totalRegistro, totalRegistros } from '../domain/calc';
import type { Ajustes, Categoria, Periodo, Registro } from '../domain/types';
import { borrarPeriodo, guardarPeriodo } from '../data/db';
import { inicioPeriodoAbierto } from './hooks';

const NOMBRES: Record<Categoria, string> = {
  subtitulos: 'Subtítulos',
  horas: 'Horas',
  metadata: 'Metadata',
  presentacion: 'Presentaciones',
};

interface Props {
  registros: Registro[];
  periodos: Periodo[];
  ajustes: Ajustes;
}

export function Resumen({ registros, periodos, ajustes }: Props) {
  const inicio = inicioPeriodoAbierto(periodos, registros);
  const [desde, setDesde] = useState(inicio);
  const [hasta, setHasta] = useState(hoy());
  const [nombre, setNombre] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  // Si se cierra un periodo, el formulario pasa al siguiente.
  useEffect(() => {
    setDesde(inicio);
    setHasta(hoy());
    setNombre(null);
  }, [inicio]);

  const nombreFinal = nombre ?? nombrePeriodo(desde, hasta);
  const delPeriodo = registros.filter((r) => enRango(r, desde, hasta));
  const total = totalRegistros(delPeriodo, ajustes);
  const horasComentarios = delPeriodo.filter((r) => r.categoria === 'horas').reduce((s, r) => s + (r.horas ?? 0), 0);

  async function exportar(bloques: { nombre: string; desde: string; hasta: string }[], archivo: string) {
    setGenerando(true);
    try {
      // ExcelJS es pesado: se carga solo al exportar.
      const { construirLibro, descargarLibro } = await import('../export/excel');
      const libro = construirLibro(
        bloques.map((b) => ({ nombre: b.nombre, registros: registros.filter((r) => enRango(r, b.desde, b.hasta)) })),
        ajustes,
      );
      await descargarLibro(libro, archivo);
    } finally {
      setGenerando(false);
    }
  }

  const prefijo = ajustes.nombreEmpleado ? `${ajustes.nombreEmpleado} ` : '';

  async function cerrar() {
    const solapado = periodos.find((p) => desde <= p.hasta && hasta >= p.desde);
    if (solapado) {
      alert(`Estas fechas se cruzan con el periodo cerrado "${solapado.nombre}".`);
      return;
    }
    if (!confirm(`¿Cerrar el periodo "${nombreFinal}" (${desde} a ${hasta}) por ${dinero(total)}?\nLo siguiente que registres irá al periodo nuevo.`)) return;
    await guardarPeriodo({ id: nuevoId(), nombre: nombreFinal, desde, hasta, cerradoEn: Date.now() });
  }

  const porCategoria = (Object.keys(NOMBRES) as Categoria[])
    .map((c) => {
      const rs = delPeriodo.filter((r) => r.categoria === c);
      return { c, n: rs.length, total: rs.reduce((s, r) => s + totalRegistro(r, ajustes), 0) };
    })
    .filter((x) => x.n);

  return (
    <div className="resumen">
      <section className="tarjeta">
        <h2>Generar resumen</h2>
        <div className="fila">
          <label>
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
        <label>
          Nombre del periodo (nombre de la hoja)
          <input value={nombreFinal} onChange={(e) => setNombre(e.target.value)} />
        </label>

        <div className="totales">
          {porCategoria.map((x) => (
            <div key={x.c}>
              <span>{NOMBRES[x.c]} ({x.c === 'horas' ? `${horasComentarios} h` : x.n})</span>
              <b>{dinero(x.total)}</b>
            </div>
          ))}
          <div className="gran-total">
            <span>Total</span>
            <b>{dinero(total)}</b>
          </div>
        </div>

        <button
          type="button" className="primario" disabled={generando || !delPeriodo.length}
          onClick={() => exportar([{ nombre: nombreFinal, desde, hasta }], `${prefijo}Subtitulos ${nombreFinal}.xlsx`)}
        >
          {generando ? 'Generando…' : 'Descargar Excel'}
        </button>
        <button type="button" disabled={!delPeriodo.length} onClick={cerrar}>
          Cerrar periodo (marcar como cobrado)
        </button>
      </section>

      <section className="tarjeta">
        <h2>Periodos cerrados</h2>
        {!periodos.length && <p className="ayuda">Todavía no hay periodos cerrados.</p>}
        <ul className="lista">
          {periodos.map((p) => {
            const t = totalRegistros(registros.filter((r) => enRango(r, p.desde, p.hasta)), ajustes);
            return (
              <li key={p.id}>
                <div className="info">
                  <b>{p.nombre}</b>
                  <small>{p.desde} → {p.hasta}</small>
                </div>
                <div className="monto">{dinero(t)}</div>
                <div className="acciones">
                  <button type="button" title="Descargar Excel"
                    onClick={() => exportar([p], `${prefijo}Subtitulos ${p.nombre}.xlsx`)}>⤓</button>
                  <button type="button" title="Reabrir periodo"
                    onClick={() => confirm(`¿Reabrir "${p.nombre}"? Los registros no se borran.`) && borrarPeriodo(p.id)}>↺</button>
                </div>
              </li>
            );
          })}
        </ul>
        {periodos.length > 1 && (
          <button type="button" onClick={() => exportar([...periodos].reverse(), `${prefijo}Historial completo.xlsx`)}>
            Descargar todos en un solo Excel
          </button>
        )}
      </section>
    </div>
  );
}
