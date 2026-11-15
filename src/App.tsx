import { useEffect, useState } from 'react';
import { dinero, enRango, hoy, totalRegistros } from './domain/calc';
import { pedirPersistencia } from './data/db';
import { AjustesPagina } from './ui/AjustesPagina';
import { FormularioRegistro } from './ui/FormularioRegistro';
import { ListaRegistros } from './ui/ListaRegistros';
import { Resumen } from './ui/Resumen';
import { respaldoVencido } from './ui/respaldo';
import { inicioPeriodoAbierto, useAjustes, usePeriodos, useRegistros } from './ui/hooks';

type Pagina = 'registrar' | 'registros' | 'resumen' | 'ajustes';

const PAGINAS: { id: Pagina; nombre: string }[] = [
  { id: 'registrar', nombre: '➕ Anotar' },
  { id: 'registros', nombre: '📋 Mis trabajos' },
  { id: 'resumen', nombre: '📄 Excel' },
  { id: 'ajustes', nombre: '⚙ Ajustes' },
];

export function App() {
  const [pagina, setPagina] = useState<Pagina>('registrar');
  const registros = useRegistros();
  const periodos = usePeriodos();
  const ajustes = useAjustes();

  useEffect(() => {
    pedirPersistencia();
  }, []);

  if (!registros) return null;

  const inicio = inicioPeriodoAbierto(periodos, registros);
  const abiertos = registros.filter((r) => enRango(r, inicio, '9999-12-31'));
  const respaldoPendiente = respaldoVencido();
  const hoyRegistros = registros.filter((r) => r.fecha === hoy());

  return (
    <div className="app">
      <header>
        <div className="marca">
          <img src="./logo.svg" alt="" width="44" height="44" />
          <div>
          <small>Llevas en este periodo (desde el {inicio.split('-').reverse().join('/')})</small>
          <strong>{dinero(totalRegistros(abiertos, ajustes))}</strong>
          </div>
        </div>
        <nav>
          {PAGINAS.map((p) => (
            <button key={p.id} className={p.id === pagina ? 'activo' : ''} onClick={() => setPagina(p.id)}>
              {p.nombre}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {pagina === 'registrar' && (
          <>
            {registros.length === 0 && (
              <section className="tarjeta bienvenida">
                <h2>👋 ¡Hola! Así se usa:</h2>
                <ol>
                  <li><b>Anota</b> cada trabajo cuando lo termines (abajo, en esta pantalla).</li>
                  <li>Cuando se acabe el periodo, ve a <b>📄 Excel</b>.</li>
                  <li>Toca <b>Descargar mi Excel</b>. ¡Listo! Ya viene con el formato de siempre.</li>
                </ol>
              </section>
            )}
            {registros.length > 0 && respaldoPendiente && (
              <section className="tarjeta alerta">
                <b>💾 Guarda una copia de seguridad</b>
                <p>Tus datos están solo en esta computadora. Descarga una copia para no perderlos.</p>
                <button type="button" onClick={() => setPagina('ajustes')}>Ir a Ajustes → Copia de seguridad</button>
              </section>
            )}
            <section className="tarjeta">
              <h2>Anotar un trabajo</h2>
              <FormularioRegistro ajustes={ajustes} historial={registros} />
            </section>
            <section className="tarjeta">
              <h2>Lo que anotaste hoy</h2>
              <ListaRegistros registros={hoyRegistros} historial={registros} ajustes={ajustes} vacio="Todavía no has anotado nada hoy." />
            </section>
          </>
        )}
        {pagina === 'registros' && (
          <section className="tarjeta">
            <h2>Mis trabajos de este periodo ({abiertos.length})</h2>
            <ListaRegistros registros={abiertos} historial={registros} ajustes={ajustes} vacio="Aquí aparecerán los trabajos que anotes." />
            {registros.length > abiertos.length && (
              <details>
                <summary>Ver trabajos de periodos anteriores ({registros.length - abiertos.length})</summary>
                <ListaRegistros registros={registros.filter((r) => r.fecha < inicio)} historial={registros} ajustes={ajustes} />
              </details>
            )}
          </section>
        )}
        {pagina === 'resumen' && <Resumen registros={registros} periodos={periodos} ajustes={ajustes} />}
        {pagina === 'ajustes' && <AjustesPagina ajustes={ajustes} />}
      </main>
      <footer className="version">v{__APP_VERSION__}</footer>
    </div>
  );
}
