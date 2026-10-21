import { useState } from 'react';
import { dinero, fechaCorta, hoy, nuevoId, totalRegistro } from '../domain/calc';
import type { Ajustes, Registro } from '../domain/types';
import { borrarRegistro, guardarRegistro } from '../data/db';
import { FormularioRegistro } from './FormularioRegistro';

const IDIOMA_CORTO = { eng: 'ENG', eng_cc: 'ENG CC', spa: 'SPA' } as const;

function detalle(r: Registro): string {
  switch (r.categoria) {
    case 'subtitulos':
      return `${r.descripcion} · ${r.idiomas.map((i) => IDIOMA_CORTO[i]).join('+') || '—'} · ${r.unidades} × ${dinero(r.precioUnitario)}`;
    case 'horas':
      return `${r.horas} h`;
    case 'metadata':
      return 'Metadata';
    case 'presentacion':
      return 'Presentación';
  }
}

interface Props {
  registros: Registro[];
  historial: Registro[];
  ajustes: Ajustes;
  vacio?: string;
}

export function ListaRegistros({ registros, historial, ajustes, vacio = 'No hay registros.' }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

  if (!registros.length) return <p className="ayuda">{vacio}</p>;

  async function borrar(r: Registro) {
    if (!confirm(`¿Borrar "${r.programa} — ${detalle(r)}"?`)) return;
    await borrarRegistro(r.id);
  }

  async function repetir(r: Registro) {
    await guardarRegistro({ ...r, id: nuevoId(), fecha: hoy(), creadoEn: Date.now() });
  }

  return (
    <ul className="lista">
      {registros.map((r) =>
        editandoId === r.id ? (
          <li key={r.id} className="editando">
            <FormularioRegistro ajustes={ajustes} historial={historial} editando={r} onGuardado={() => setEditandoId(null)} />
            <button type="button" onClick={() => setEditandoId(null)}>Cancelar</button>
          </li>
        ) : (
          <li key={r.id}>
            <div className="fecha">{fechaCorta(r.fecha)}</div>
            <div className="info">
              <b>{r.programa}</b>
              <small>{detalle(r)}{r.nota ? ` · ${r.nota}` : ''}</small>
            </div>
            <div className="monto">{dinero(totalRegistro(r, ajustes))}</div>
            <div className="acciones">
              <button type="button" title="Repetir hoy" onClick={() => repetir(r)}>↻</button>
              <button type="button" title="Editar" onClick={() => setEditandoId(r.id)}>✎</button>
              <button type="button" title="Borrar" onClick={() => borrar(r)}>✕</button>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
