import { useMemo, useState } from 'react';
import {
  IDIOMAS, calcularUnidades, sumarDias, cantidadRango, descripcionRango, dinero, hoy, nuevoId,
} from '../domain/calc';
import type { Ajustes, Categoria, Idioma, Registro } from '../domain/types';
import { guardarRegistro } from '../data/db';

const CATEGORIAS: { id: Categoria; nombre: string }[] = [
  { id: 'subtitulos', nombre: '📝 Subtítulos' },
  { id: 'horas', nombre: '⏱ Horas' },
  { id: 'metadata', nombre: '🏷 Metadata' },
  { id: 'presentacion', nombre: '🎞 Presentación' },
];

interface Props {
  ajustes: Ajustes;
  /** Historial completo, para autocompletar y sugerir precios. */
  historial: Registro[];
  /** Si viene, el formulario edita este registro. */
  editando?: Registro;
  onGuardado?: (r: Registro) => void;
}

function num(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function FormularioRegistro({ ajustes, historial, editando, onGuardado }: Props) {
  const ultimoSub = historial.find((r) => r.categoria === 'subtitulos');
  const e = editando;

  const [categoria, setCategoria] = useState<Categoria>(e?.categoria ?? 'subtitulos');
  const [fecha, setFecha] = useState(e?.fecha ?? hoy());
  const [programa, setPrograma] = useState(
    e?.programa ?? ultimoSub?.programa ?? '',
  );
  const [tipoId, setTipoId] = useState(e?.tipoId ?? ajustes.tipos[0]?.id ?? 'otro');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [idiomas, setIdiomas] = useState<Idioma[]>(e?.idiomas ?? ultimoSub?.idiomas ?? ['eng', 'spa']);
  const [unidadesManual, setUnidadesManual] = useState<string | null>(e ? String(e.unidades) : null);
  const [precioManual, setPrecioManual] = useState<string | null>(e ? String(e.precioUnitario) : null);
  const [descManual, setDescManual] = useState<string | null>(e?.descripcion ?? null);
  const [horas, setHoras] = useState(e?.horas != null ? String(e.horas) : categoria === 'horas' ? '1' : '');
  const [actividad, setActividad] = useState(e?.categoria === 'horas' ? e.programa : ajustes.actividadHoras);
  const [monto, setMonto] = useState(
    e && (e.categoria === 'metadata' || e.categoria === 'presentacion') ? String(e.precioUnitario) : '',
  );
  const [nota, setNota] = useState(e?.nota ?? '');
  const [aviso, setAviso] = useState<string | null>(null);

  const montoPorDefecto = categoria === 'metadata' ? ajustes.montoMetadata : ajustes.montoPresentacion ?? 20;
  const tipo = ajustes.tipos.find((t) => t.id === tipoId);

  const programas = useMemo(() => {
    const vistos = new Set<string>();
    for (const r of historial) if (r.categoria === categoria || categoria === 'metadata') vistos.add(r.programa);
    return [...vistos].filter(Boolean);
  }, [historial, categoria]);

  // Precio sugerido: el último usado para este programa+tipo, si no el último de este tipo, si no el de Ajustes.
  const precioSugerido = useMemo(() => {
    const mismoTipo = historial.filter((r) => r.categoria === 'subtitulos' && r.tipoId === tipoId);
    const p = programa.trim().toLowerCase();
    return (
      mismoTipo.find((r) => r.programa.trim().toLowerCase() === p)?.precioUnitario ??
      mismoTipo[0]?.precioUnitario ??
      tipo?.precio ??
      0
    );
  }, [historial, tipoId, programa, tipo]);

  // Siguiente episodio sugerido: continúa donde quedó el último rango de este programa.
  const siguienteEp = useMemo(() => {
    const p = programa.trim().toLowerCase();
    const ultimo = historial.find(
      (r) => r.categoria === 'subtitulos' && r.tipoId === tipoId && r.programa.trim().toLowerCase() === p,
    );
    const m = ultimo?.descripcion.match(/(\d+)\s*$/);
    return m ? Number(m[1]) + 1 : 1;
  }, [historial, programa, tipoId]);

  const nDesde = desde === '' ? siguienteEp : num(desde);
  const nHasta = num(hasta);
  const cantidadBase = tipo?.porRango ? cantidadRango(nDesde, nHasta) : num(cantidad);
  const unidades = unidadesManual != null ? num(unidadesManual) : calcularUnidades(cantidadBase, idiomas);
  const precio = precioManual != null ? num(precioManual) : precioSugerido;
  const descAuto = tipo?.porRango ? descripcionRango(nDesde, nHasta) : tipo?.id === 'otro' ? '' : tipo?.nombre ?? '';
  const descripcion = descManual ?? descAuto;

  function construir(): Registro | string {
    const base = { id: e?.id ?? nuevoId(), fecha, creadoEn: e?.creadoEn ?? Date.now(), nota: nota.trim() || undefined };
    const h = horas === '' ? undefined : num(horas);
    if (!fecha) return 'Falta la fecha';
    switch (categoria) {
      case 'subtitulos':
        if (!programa.trim()) return 'Escribe el programa';
        if (!descripcion.trim()) return 'Escribe qué se subtituló (columna Episodio)';
        if (unidades <= 0) return 'La cantidad debe ser mayor a 0';
        return {
          ...base, categoria, programa: programa.trim(), tipoId, descripcion: descripcion.trim(),
          idiomas, unidades, precioUnitario: precio, horas: h,
        };
      case 'horas':
        if (!h || h <= 0) return 'Indica cuántas horas';
        return {
          ...base, categoria, programa: actividad.trim() || ajustes.actividadHoras, descripcion: '',
          idiomas: [], unidades: 1, precioUnitario: 0, horas: h,
        };
      case 'metadata':
      case 'presentacion': {
        if (!programa.trim()) return categoria === 'metadata' ? 'Escribe el programa' : 'Escribe el nombre de la presentación';
        const m = monto === '' ? montoPorDefecto : num(monto);
        return {
          ...base, categoria, programa: programa.trim(), descripcion: '', idiomas: [], unidades: 1,
          precioUnitario: m, horas: h,
        };
      }
    }
  }

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    const r = construir();
    if (typeof r === 'string') {
      setAviso('⚠ ' + r);
      return;
    }
    await guardarRegistro(r);
    setAviso(`✓ Listo, se guardó: ${r.programa}${r.descripcion ? ' — ' + r.descripcion : ''}${r.horas && r.categoria === 'horas' ? ` (${r.horas} h)` : ''}`);
    onGuardado?.(r);
    if (!e) {
      // Se mantienen programa, tipo e idiomas para registrar el siguiente rápido.
      setDesde('');
      setHasta('');
      setCantidad('1');
      setUnidadesManual(null);
      setPrecioManual(null);
      setDescManual(null);
      setMonto('');
      setNota('');
      setHoras(categoria === 'horas' ? '1' : '');
    }
  }

  function toggleIdioma(id: Idioma) {
    setUnidadesManual(null);
    setIdiomas((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // ENG y ENG CC van en la misma columna: son excluyentes.
      const sinEng = id === 'eng' ? prev.filter((x) => x !== 'eng_cc') : id === 'eng_cc' ? prev.filter((x) => x !== 'eng') : prev;
      return [...sinEng, id];
    });
  }

  function cambiarCategoria(c: Categoria) {
    setCategoria(c);
    setAviso(null);
    setPrograma(c === 'subtitulos' ? ultimoSub?.programa ?? '' : '');
    setHoras(c === 'horas' ? '1' : '');
  }

  return (
    <form className="formulario" onSubmit={guardar}>
      {!e && (
        <div className="segmentos">
          {CATEGORIAS.map((c) => (
            <button
              type="button" key={c.id}
              className={c.id === categoria ? 'activo' : ''}
              onClick={() => cambiarCategoria(c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="campo">
        <span className="pregunta">¿De qué día fue?</span>
        <div className="chips">
          <button type="button" className={fecha === hoy() ? 'activo' : ''} onClick={() => setFecha(hoy())}>Hoy</button>
          <button type="button" className={fecha === sumarDias(hoy(), -1) ? 'activo' : ''} onClick={() => setFecha(sumarDias(hoy(), -1))}>Ayer</button>
          <input type="date" value={fecha} onChange={(x) => setFecha(x.target.value)} required aria-label="Otro día" />
        </div>
      </div>

      {categoria === 'subtitulos' && (
        <>
          <label>
            <span className="pregunta">¿De qué programa o serie?</span>
            <input list="programas" value={programa} onChange={(x) => setPrograma(x.target.value)} placeholder="Ej: La llorona" />
          </label>

          <div className="campo">
            <span className="pregunta">¿Qué trabajo hiciste?</span>
            <div className="chips">
              {ajustes.tipos.map((t) => (
                <button
                  type="button" key={t.id}
                  className={t.id === tipoId ? 'activo' : ''}
                  onClick={() => { setTipoId(t.id); setPrecioManual(null); setDescManual(null); setUnidadesManual(null); }}
                >
                  {t.nombre}
                </button>
              ))}
            </div>
          </div>

          {tipo?.porRango ? (
            <div className="fila">
              <label>
                Desde el episodio
                <input inputMode="numeric" value={desde} placeholder={String(siguienteEp)}
                  onChange={(x) => { setDesde(x.target.value); setUnidadesManual(null); setDescManual(null); }} />
              </label>
              <label>
                Hasta el episodio
                <input inputMode="numeric" value={hasta} placeholder="vacío si fue solo uno"
                  onChange={(x) => { setHasta(x.target.value); setUnidadesManual(null); setDescManual(null); }} />
              </label>
            </div>
          ) : (
            <label>
              ¿Cuántos?
              <input inputMode="numeric" value={cantidad}
                onChange={(x) => { setCantidad(x.target.value); setUnidadesManual(null); }} />
            </label>
          )}

          <div className="campo">
            <span className="pregunta">¿En qué idioma?</span>
            <div className="chips">
              {IDIOMAS.map((i) => (
                <button type="button" key={i.id} className={idiomas.includes(i.id) ? 'activo' : ''} onClick={() => toggleIdioma(i.id)}>
                  {i.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <details className="avanzado" open={!!e}>
            <summary>
              <span>Se anotará: <b>{programa || '…'} — {descripcion || '…'}</b></span>
              <small>{unidades} × {dinero(precio)} = {dinero(unidades * precio)} · tocar para cambiar los detalles</small>
            </summary>
            <label>
              Texto que saldrá en el Excel (columna Episodio)
              <input value={descripcion} onChange={(x) => setDescManual(x.target.value)} />
            </label>
            <div className="fila">
              <label>
                Cantidad total (episodios × idiomas)
                <input inputMode="decimal" value={unidadesManual ?? String(unidades)} onChange={(x) => setUnidadesManual(x.target.value)} />
              </label>
              <label>
                Precio de cada uno
                <input inputMode="decimal" value={precioManual ?? String(precio)} onChange={(x) => setPrecioManual(x.target.value)} />
              </label>
            </div>
            <label>
              Horas dedicadas (opcional)
              <input inputMode="decimal" value={horas} onChange={(x) => setHoras(x.target.value)} placeholder="para estadísticas" />
            </label>
          </details>
        </>
      )}

      {categoria === 'horas' && (
        <>
          <label>
            <span className="pregunta">¿Cuántas horas trabajaste?</span>
            <input inputMode="decimal" value={horas} onChange={(x) => setHoras(x.target.value)} />
          </label>
          <div className="chips">
            {['0.5', '1', '1.5', '2', '3', '4'].map((h) => (
              <button type="button" key={h} className={horas === h ? 'activo' : ''} onClick={() => setHoras(h)}>{h} h</button>
            ))}
          </div>
          <label>
            ¿En qué actividad?
            <input list="actividades" value={actividad} onChange={(x) => setActividad(x.target.value)} />
          </label>
          <p className="ayuda">Tarifa: {dinero(ajustes.tarifaHora)} / hora (se cambia en Ajustes)</p>
        </>
      )}

      {(categoria === 'metadata' || categoria === 'presentacion') && (
        <>
          <label>
            <span className="pregunta">{categoria === 'metadata' ? '¿De qué programa?' : '¿Cómo se llama la presentación?'}</span>
            <input list="programas" value={programa} onChange={(x) => setPrograma(x.target.value)} />
          </label>
          <label>
            ¿De cuánto es? (cámbialo si es distinto)
            <input inputMode="decimal" value={monto}
              placeholder={String(montoPorDefecto)}
              onChange={(x) => setMonto(x.target.value)} />
          </label>
          <label>
            Horas dedicadas (opcional)
            <input inputMode="decimal" value={horas} onChange={(x) => setHoras(x.target.value)} />
          </label>
        </>
      )}

      <label>
        Nota personal (opcional, no sale en el Excel)
        <input value={nota} onChange={(x) => setNota(x.target.value)} />
      </label>

      <datalist id="programas">{programas.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="actividades">
        {[...new Set(historial.filter((r) => r.categoria === 'horas').map((r) => r.programa))].map((p) => <option key={p} value={p} />)}
      </datalist>

      <button type="submit" className="primario">
        {e ? 'Guardar cambios' : '✓ Guardar este trabajo'}
      </button>
      {aviso && <p role="status" className={aviso.startsWith('✓') ? 'ok aviso' : 'error aviso'}>{aviso}</p>}
    </form>
  );
}
