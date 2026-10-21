const CLAVE = 'ultimo-respaldo';
const DIAS = 7;

export function marcarRespaldoHecho(): void {
  try {
    localStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    /* sin almacenamiento */
  }
}

/** true si nunca se ha hecho una copia o la última tiene más de 7 días. */
export function respaldoVencido(): boolean {
  try {
    const t = Number(localStorage.getItem(CLAVE));
    return !t || Date.now() - t > DIAS * 86400000;
  } catch {
    return false;
  }
}
