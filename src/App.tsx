import { useEffect, useState } from 'react';
import { dinero, enRango, hoy, totalRegistros } from './domain/calc';
import { pedirPersistencia } from './data/db';
import { AjustesPagina } from './ui/AjustesPagina';
import { FormularioRegistro } from './ui/FormularioRegistro';
import { ListaRegistros } from './ui/ListaRegistros';
import { Resumen } from './ui/Resumen';
import { inicioPeriodoAbierto, useAjustes, usePeriodos, useRegistros } from './ui/hooks';

type Pagina = 'registrar' | 'registros' | 'resumen' | 'ajustes';

const PAGINAS: { id: Pagina; nombre: string }[] = [
  { id: 'registrar', nombre: 'Registrar' },
  { id: 'registros', nombre: 'Registros' },
  { id: 'resumen', nombre: 'Resumen' },
  { id: 'ajustes', nombre: 'Ajustes' },
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
  const hoyRegistros = registros.filter((r) => r.fecha === hoy());

  return (
    <div className="app">
      <header>
        <div>
          <small>Periodo actual (desde {inicio})</small>
          <strong>{dinero(totalRegistros(abiertos, ajustes))}</strong>
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
            <section className="tarjeta">
              <FormularioRegistro ajustes={ajustes} historial={registros} />
            </section>
            <section className="tarjeta">
              <h2>Hoy · {dinero(totalRegistros(hoyRegistros, ajustes))}</h2>
              <ListaRegistros registros={hoyRegistros} historial={registros} ajustes={ajustes} vacio="Nada registrado hoy todavía." />
            </section>
          </>
        )}
        {pagina === 'registros' && (
          <section className="tarjeta">
            <h2>Periodo actual · {abiertos.length} registros</h2>
            <ListaRegistros registros={abiertos} historial={registros} ajustes={ajustes} vacio="No hay registros en el periodo actual." />
            {registros.length > abiertos.length && (
              <details>
                <summary>Periodos anteriores ({registros.length - abiertos.length})</summary>
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
