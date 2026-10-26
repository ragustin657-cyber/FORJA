const SIETE_DIAS = 7 * 86_400_000;

/** True si la app se abrió desde el ícono de inicio (no desde Safari). */
export function estaInstalada(): boolean {
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
}

/** Pide al sistema que no borre los datos de la app. Devuelve false si no está disponible. */
export async function pedirPersistencia(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** El aviso de instalación se muestra si la app no está instalada y no se cerró en los últimos 7 días. */
export function mostrarAvisoInstalar(instalada: boolean, cerradoEn: number | null, ahora: number): boolean {
  if (instalada) return false;
  return cerradoEn === null || ahora - cerradoEn >= SIETE_DIAS;
}
