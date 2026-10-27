import { useEffect, useRef, useState } from 'react';
import { ErrorBackup, exportar, leerResumen, nombreArchivo, restaurar, tamanoFotos } from '../../data/backup';
import { cuerpoRepo } from '../../data/repos/cuerpo';
import { ajustesRepo } from '../../data/repos/ajustes';
import { Boton } from '../componentes/Boton';
import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';
import { fechaRelativa } from '../../core/formato';

type Resumen = Awaited<ReturnType<typeof leerResumen>>;

const megas = (bytes: number) => `${Math.max(0.1, bytes / 1_000_000).toFixed(1).replace('.', ',')} MB`;
const fotosTexto = (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'}`;

/** Error de iOS cuando la hoja de compartir se pide sin un toque reciente (la copia tardó en armarse). */
class SinGesto extends Error {
  constructor(public archivo: File) {
    super('sin gesto');
  }
}

async function compartir(archivo: File) {
  try {
    await navigator.share({ files: [archivo], title: 'Copia de FORJA' });
  } catch (e) {
    if ((e as Error).name === 'NotAllowedError') throw new SinGesto(archivo);
    throw e;
  }
}

async function entregar(blob: Blob) {
  const archivo = new File([blob], nombreArchivo(), { type: 'application/zip' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [archivo] })) {
    try {
      await compartir(archivo);
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError' || e instanceof SinGesto) throw e;
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
  const [fotos, setFotos] = useState<{ cantidad: number; bytes: number }>({ cantidad: 0, bytes: 0 });
  const [preguntar, setPreguntar] = useState(false);
  const [paraCompartir, setParaCompartir] = useState<File | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ajustesRepo.obtener().then((a) => setUltima(a.ultimaCopia));
    Promise.all([cuerpoRepo.fotos(), tamanoFotos()]).then(([fs, bytes]) => setFotos({ cantidad: fs.length, bytes }));
  }, []);

  async function alExportar(incluirFotos?: boolean) {
    setError(null);
    setMensaje(null);
    if (incluirFotos === undefined && fotos.cantidad > 0) {
      setPreguntar(true);
      return;
    }
    setPreguntar(false);
    setOcupado(true);
    try {
      await entregar(await exportar({ incluirFotos: incluirFotos ?? false }));
      await copiaLista();
    } catch (e) {
      if (e instanceof SinGesto) setParaCompartir(e.archivo);
      else if ((e as Error).name !== 'AbortError') setError('No se pudo generar la copia.');
    } finally {
      setOcupado(false);
    }
  }

  async function copiaLista() {
    const ahora = Date.now();
    await ajustesRepo.guardar({ ultimaCopia: ahora });
    setUltima(ahora);
    setMensaje('Copia lista. Guardala en Archivos o iCloud Drive.');
  }

  async function alCompartir() {
    if (!paraCompartir) return;
    try {
      await compartir(paraCompartir);
      setParaCompartir(null);
      await copiaLista();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('No se pudo abrir la hoja de compartir.');
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
      Promise.all([cuerpoRepo.fotos(), tamanoFotos()]).then(([fs, bytes]) => setFotos({ cantidad: fs.length, bytes }));
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
            Tus rutinas, entrenamientos, comidas y fotos viven solo en este iPhone. Hacé una copia una vez por mes y guardala en Archivos o iCloud Drive.
          </p>
          <p className="texto-2" style={{ fontSize: 14 }}>
            {ultima ? `Última copia: ${fechaRelativa(ultima)}` : 'Todavía no hiciste ninguna copia.'}
          </p>
          <Boton ancho onClick={() => alExportar()} disabled={ocupado}>Exportar copia</Boton>
          {paraCompartir && (
            <div className="aviso aviso-dorado pila" style={{ marginTop: 14 }}>
              <span>Tu copia está lista. Tocá para guardarla.</span>
              <Boton variante="dorado" onClick={alCompartir}>Compartir copia</Boton>
            </div>
          )}
          {preguntar && (
            <section aria-label="¿Incluir fotos?" className="aviso pila" style={{ marginTop: 14 }}>
              <strong>¿Incluir fotos?</strong>
              <span className="texto-2">Tenés {fotosTexto(fotos.cantidad)} de progreso (≈ {megas(fotos.bytes)}). Sin fotos la copia es más liviana.</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Boton onClick={() => alExportar(true)} disabled={ocupado}>Con fotos ({megas(fotos.bytes)})</Boton>
                <Boton variante="secundario" onClick={() => alExportar(false)} disabled={ocupado}>Sin fotos</Boton>
              </div>
            </section>
          )}
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
                Copia del {new Date(pendiente.resumen.fecha).toLocaleDateString('es-AR')}: {pendiente.resumen.sesiones} entrenamientos, {pendiente.resumen.rutinas} rutinas y {fotosTexto(pendiente.resumen.fotos)}.
              </p>
              {pendiente.resumen.fotos === 0 && fotos.cantidad > 0 && (
                <p className="texto-2">Esta copia no tiene fotos: se conservan las que ya tenés.</p>
              )}
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
