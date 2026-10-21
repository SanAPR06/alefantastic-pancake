import { useEffect, useState } from 'react';
import { TIPOS_POR_DEFECTO, hoy, nuevoId } from '../domain/calc';
import type { Ajustes, TipoTrabajo } from '../domain/types';
import { crearRespaldo, guardarAjustes, restaurarRespaldo, type Respaldo } from '../data/db';
import { descargarBlob } from '../export/descargar';
import { marcarRespaldoHecho } from './respaldo';

export function AjustesPagina({ ajustes }: { ajustes: Ajustes }) {
  const [borrador, setBorrador] = useState(ajustes);
  const [aviso, setAviso] = useState<string | null>(null);
  // Cambia al restaurar la lista para que los campos de precio se vuelvan a dibujar.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    setBorrador(ajustes);
    setVersion((v) => v + 1);
  }, [ajustes]);

  function cambiarTipo(id: string, cambios: Partial<TipoTrabajo>) {
    setBorrador((b) => ({ ...b, tipos: b.tipos.map((t) => (t.id === id ? { ...t, ...cambios } : t)) }));
  }

  async function guardar() {
    await guardarAjustes({ ...borrador, tipos: borrador.tipos.filter((t) => t.nombre.trim()) });
    setAviso('✓ Ajustes guardados');
  }

  async function exportarRespaldo() {
    const r = await crearRespaldo();
    descargarBlob(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }), `respaldo-trabajo-${hoy()}.json`);
    marcarRespaldoHecho();
    setAviso('✓ Copia descargada. Guárdala en un lugar seguro (por ejemplo, tu correo o una USB).');
  }

  async function importarRespaldo(archivo: File | undefined) {
    if (!archivo) return;
    try {
      const datos = JSON.parse(await archivo.text()) as Respaldo;
      if (!confirm(`Esto reemplaza TODOS los datos actuales por los del respaldo (${datos.registros?.length ?? 0} registros). ¿Continuar?`)) return;
      await restaurarRespaldo(datos);
      setAviso('✓ Respaldo restaurado');
    } catch (e) {
      setAviso('⚠ ' + (e instanceof Error ? e.message : 'No se pudo leer el archivo'));
    }
  }

  const num = (v: string) => parseFloat(v.replace(',', '.')) || 0;

  return (
    <div className="resumen">
      <section className="tarjeta">
        <h2>Datos generales</h2>
        <label>
          Tu nombre (aparece en el nombre del Excel)
          <input value={borrador.nombreEmpleado} onChange={(e) => setBorrador({ ...borrador, nombreEmpleado: e.target.value })} />
        </label>
        <div className="fila">
          <label>
            Pago por hora
            <input inputMode="decimal" defaultValue={borrador.tarifaHora} key={'h' + ajustes.tarifaHora}
              onChange={(e) => setBorrador({ ...borrador, tarifaHora: num(e.target.value) })} />
          </label>
          <label>
            Pago por metadata
            <input inputMode="decimal" defaultValue={borrador.montoMetadata} key={'m' + ajustes.montoMetadata}
              onChange={(e) => setBorrador({ ...borrador, montoMetadata: num(e.target.value) })} />
          </label>
        </div>
        <label>
          Pago sugerido por presentación
          <input inputMode="decimal" defaultValue={borrador.montoPresentacion ?? 20} key={'p' + ajustes.montoPresentacion}
            onChange={(e) => setBorrador({ ...borrador, montoPresentacion: num(e.target.value) })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={borrador.precioEnExcel === true}
            onChange={(e) => setBorrador({ ...borrador, precioEnExcel: e.target.checked })} />
          Poner los precios en el Excel (déjalo apagado: los precios los pone la jefa)
        </label>
        <label>
          Nombre de la actividad por horas
          <input value={borrador.actividadHoras} onChange={(e) => setBorrador({ ...borrador, actividadHoras: e.target.value })} />
        </label>
      </section>

      <section className="tarjeta">
        <h2>Tipos de trabajo</h2>
        <p className="ayuda">Solo cambia esto si te lo piden. El número es el pago por cada episodio en cada idioma.</p>
        {borrador.tipos.map((t) => (
          <div className="fila tipo" key={`${t.id}-${version}`}>
            <input value={t.nombre} onChange={(e) => cambiarTipo(t.id, { nombre: e.target.value })} aria-label="Nombre" />
            <input inputMode="decimal" defaultValue={t.precio} className="corto" aria-label="Precio"
              onChange={(e) => cambiarTipo(t.id, { precio: num(e.target.value) })} />
            <label className="check">
              <input type="checkbox" checked={t.porRango} onChange={(e) => cambiarTipo(t.id, { porRango: e.target.checked })} />
              varios episodios
            </label>
            <button type="button" title="Quitar" onClick={() => setBorrador({ ...borrador, tipos: borrador.tipos.filter((x) => x.id !== t.id) })}>✕</button>
          </div>
        ))}
        <div className="fila">
          <button type="button" onClick={() => setBorrador({ ...borrador, tipos: [...borrador.tipos, { id: nuevoId(), nombre: 'Nuevo tipo', precio: 0, porRango: false }] })}>
            + Agregar tipo
          </button>
          <button type="button" onClick={() => { setBorrador({ ...borrador, tipos: TIPOS_POR_DEFECTO }); setVersion((v) => v + 1); }}>Restaurar lista original</button>
        </div>
      </section>

      <button type="button" className="primario" onClick={guardar}>Guardar ajustes</button>
      {aviso && <p className={aviso.startsWith('✓') ? 'ok' : 'error'}>{aviso}</p>}

      <section className="tarjeta">
        <h2>Copia de seguridad</h2>
        <p className="ayuda">
          Lo que anotas se guarda solo en esta computadora. Descarga una copia una vez por semana, y antes de
          cambiar de computadora o de borrar el historial del navegador.
        </p>
        <button type="button" onClick={exportarRespaldo}>Descargar copia de seguridad</button>
        <label className="boton-archivo">
          Recuperar desde una copia…
          <input type="file" accept="application/json,.json" onChange={(e) => importarRespaldo(e.target.files?.[0])} />
        </label>
      </section>
    </div>
  );
}
