import { useEffect, useRef, useState } from 'react';
import { ErrorBackup, exportar, leerResumen, nombreArchivo, restaurar } from '../../data/backup';
import { ajustesRepo } from '../../data/repos/ajustes';
import { Boton } from '../componentes/Boton';
import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';
import { fechaRelativa } from '../../core/formato';

type Resumen = Awaited<ReturnType<typeof leerResumen>>;

async function entregar(blob: Blob) {
  const archivo = new File([blob], nombreArchivo(), { type: 'application/zip' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Copia de FORJA' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
    }
  }
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function Backup() {
  const [ultima, setUltima] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<{ archivo: File; resumen: Resumen } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ajustesRepo.obtener().then((a) => setUltima(a.ultimaCopia));
  }, []);

  async function alExportar() {
    setError(null);
    setMensaje(null);
    setOcupado(true);
    try {
      await entregar(await exportar({ incluirFotos: false }));
      const ahora = Date.now();
      await ajustesRepo.guardar({ ultimaCopia: ahora });
      setUltima(ahora);
      setMensaje('Copia lista. Guardala en Archivos o iCloud Drive.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('No se pudo generar la copia.');
    } finally {
      setOcupado(false);
    }
  }

  async function alElegir(archivo: File | undefined) {
    setError(null);
    setMensaje(null);
    setPendiente(null);
    if (!archivo) return;
    try {
      setPendiente({ archivo, resumen: await leerResumen(archivo) });
    } catch (e) {
      setError(e instanceof ErrorBackup ? e.message : 'No se pudo leer el archivo.');
    } finally {
      if (entrada.current) entrada.current.value = '';
    }
  }

  async function alRestaurar() {
    if (!pendiente) return;
    setOcupado(true);
    try {
      await restaurar(pendiente.archivo);
      setPendiente(null);
      setMensaje('¡Listo! Tus datos se restauraron.');
      setUltima((await ajustesRepo.obtener()).ultimaCopia);
    } catch (e) {
      setError(e instanceof ErrorBackup ? e.message : 'No se pudo restaurar la copia.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Copia de seguridad" atras />
      <div className="pila">
        <Tarjeta>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Guardar tus datos</h2>
          <p className="texto-2" style={{ marginTop: 0 }}>
            Tus rutinas y entrenamientos viven solo en este iPhone. Hacé una copia una vez por mes y guardala en Archivos o iCloud Drive.
          </p>
          <p className="texto-2" style={{ fontSize: 14 }}>
            {ultima ? `Última copia: ${fechaRelativa(ultima)}` : 'Todavía no hiciste ninguna copia.'}
          </p>
          <Boton ancho onClick={alExportar} disabled={ocupado}>Exportar copia</Boton>
        </Tarjeta>

        <Tarjeta>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Restaurar una copia</h2>
          <p className="texto-2" style={{ marginTop: 0 }}>Elegí un archivo de copia de FORJA (.zip).</p>
          <label className="boton boton-secundario boton-ancho">
            Elegir archivo
            <input ref={entrada} type="file" accept=".zip,application/zip" hidden onChange={(e) => alElegir(e.target.files?.[0])} />
          </label>
          {pendiente && (
            <div className="aviso" style={{ marginTop: 14 }}>
              <p style={{ marginTop: 0 }}>
                Copia del {new Date(pendiente.resumen.fecha).toLocaleDateString('es-AR')}: {pendiente.resumen.sesiones} entrenamientos y {pendiente.resumen.rutinas} rutinas.
              </p>
              <p className="texto-2">Ojo: restaurar reemplaza todos tus datos actuales por los de la copia.</p>
              <div className="fila">
                <Boton variante="secundario" onClick={() => setPendiente(null)}>Cancelar</Boton>
                <Boton onClick={alRestaurar} disabled={ocupado}>Restaurar copia</Boton>
              </div>
            </div>
          )}
        </Tarjeta>

        {mensaje && <div className="aviso aviso-dorado" role="status">{mensaje}</div>}
        {error && <div className="aviso" role="alert"><span className="error">{error}</span></div>}
      </div>
    </>
  );
}
