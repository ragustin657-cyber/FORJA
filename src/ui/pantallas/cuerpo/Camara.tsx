import { useCallback, useEffect, useRef, useState } from 'react';
import { idFoto, POSES, posesFaltantes, type Foto, type Pose } from '../../../core/cuerpo/fotos';
import { fechaLocal } from '../../../core/nutricion/registro';
import { ajustesRepo } from '../../../data/repos/ajustes';
import { cuerpoRepo } from '../../../data/repos/cuerpo';
import { Boton } from '../../componentes/Boton';
import { Dialogo } from '../../componentes/Dialogo';
import { Encabezado } from '../../componentes/Encabezado';
import { Silueta } from '../../componentes/Silueta';
import { desdeArchivo, procesarImagen } from '../../imagen';
import { Enlace } from '../../router';
import { desbloquearAudio, tic } from '../../sonido';

type Previa = { imagen: Blob; miniatura: Blob; url: string };
const TEMPORIZADORES = [0, 5, 10] as const;
const NOMBRE_POSE = Object.fromEntries(POSES.map((p) => [p.id, p.nombre])) as Record<Pose, string>;

function Opciones<T extends string | number>({ nombre, valor, opciones, onCambio }: { nombre: string; valor: T; opciones: { id: T; nombre: string }[]; onCambio: (v: T) => void }) {
  return (
    <div className="chips" role="radiogroup" aria-label={nombre}>
      {opciones.map((o) => (
        <button key={o.id} type="button" role="radio" className="chip" aria-checked={o.id === valor} aria-pressed={o.id === valor} onClick={() => onCambio(o.id)}>
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

/** URL temporal de la última foto de esa pose, para la foto fantasma. */
function useFotoAnterior(fotos: Foto[], pose: Pose): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const anterior = fotos.filter((f) => f.pose === pose).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado - a.creado)[0];
  const clave = anterior ? `${anterior.id}:${anterior.creado}` : '';
  useEffect(() => {
    if (!anterior) {
      setUrl(null);
      return;
    }
    let creada: string | null = null;
    let vivo = true;
    cuerpoRepo.imagen(anterior.id).then((img) => {
      if (!vivo || !img) return;
      creada = URL.createObjectURL(img.imagen);
      setUrl(creada);
    });
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return url;
}

export function Camara() {
  const hoy = fechaLocal(new Date());
  const video = useRef<HTMLVideoElement>(null);
  const reloj = useRef<ReturnType<typeof setInterval>>();
  const [fotos, setFotos] = useState<Foto[] | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const [pose, setPose] = useState<Pose>('frente');
  const [frontal, setFrontal] = useState(false);
  const [guia, setGuia] = useState(true);
  const [temporizador, setTemporizador] = useState<0 | 5 | 10>(0);
  const [cuenta, setCuenta] = useState<number | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [sinCamara, setSinCamara] = useState(false);
  const [lista, setLista] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [reemplazar, setReemplazar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const anterior = useFotoAnterior(fotos ?? [], pose);

  useEffect(() => {
    cuerpoRepo.fotos().then((fs) => {
      setFotos(fs);
      setPose(posesFaltantes(fs, hoy)[0] ?? 'frente');
    });
    ajustesRepo.obtener().then((a) => setTemporizador(a.temporizadorFoto));
  }, [hoy]);

  // La cámara se apaga al salir de la pantalla o cuando la app pasa a segundo plano.
  useEffect(() => {
    const cambio = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', cambio);
    return () => document.removeEventListener('visibilitychange', cambio);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setLista(false);
    let flujo: MediaStream | null = null;
    let vivo = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('sin cámara');
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: frontal ? 'user' : 'environment', width: { ideal: 1440 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (!vivo || !video.current) {
          flujo.getTracks().forEach((t) => t.stop());
          return;
        }
        video.current.srcObject = flujo;
        await video.current.play().catch(() => undefined);
      } catch {
        if (vivo) setSinCamara(true);
      }
    })();
    return () => {
      vivo = false;
      // Si la cámara se apaga o cambia, una cuenta en curso dispararía sobre un video viejo.
      clearInterval(reloj.current);
      setCuenta(null);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [frontal, visible]);

  const cancelarCuenta = useCallback(() => {
    clearInterval(reloj.current);
    setCuenta(null);
  }, []);
  useEffect(() => cancelarCuenta, [cancelarCuenta]);

  async function mostrarPrevia(fuente: ImageBitmap | HTMLVideoElement | HTMLImageElement) {
    const r = await procesarImagen(fuente);
    if (fuente instanceof ImageBitmap) fuente.close();
    setPrevia({ imagen: r.imagen, miniatura: r.miniatura, url: URL.createObjectURL(r.imagen) });
  }

  async function capturar() {
    const v = video.current;
    if (!v || !v.videoWidth || v.paused || !(v.srcObject as MediaStream | null)?.active) return;
    await mostrarPrevia(v);
  }

  function disparar() {
    desbloquearAudio();
    if (temporizador === 0) {
      void capturar();
      return;
    }
    let resta: number = temporizador;
    setCuenta(resta);
    tic();
    reloj.current = setInterval(() => {
      resta -= 1;
      if (resta <= 0) {
        clearInterval(reloj.current);
        setCuenta(null);
        void capturar();
      } else {
        setCuenta(resta);
        tic();
      }
    }, 1000);
  }

  function descartarPrevia() {
    if (previa) URL.revokeObjectURL(previa.url);
    setPrevia(null);
  }

  async function guardar() {
    if (!previa || !fotos) return;
    setReemplazar(false);
    if (!fecha || fecha > hoy) {
      setError('Elegí una fecha de hoy o anterior.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const id = idFoto(fecha, pose);
      await cuerpoRepo.guardarFoto({ id, fecha, pose, creado: Date.now() }, { id, imagen: previa.imagen, miniatura: previa.miniatura });
      if (fotos.length === 0) void navigator.storage?.persist?.().catch(() => undefined);
      descartarPrevia();
      const nuevas = await cuerpoRepo.fotos();
      setFotos(nuevas);
      const faltan = posesFaltantes(nuevas, fecha);
      if (faltan.length) setPose(faltan[0]);
    } catch {
      setError('No se pudo guardar la foto. Liberá espacio en el iPhone.');
    } finally {
      setGuardando(false);
    }
  }

  const usar = () => (fecha <= hoy && fotos?.some((f) => f.id === idFoto(fecha, pose)) ? setReemplazar(true) : void guardar());
  const completas = fotos !== null && posesFaltantes(fotos, fecha).length === 0;

  return (
    <>
      <Encabezado titulo="Fotos de progreso" atras />
      <div className="pila">
        <Opciones nombre="Pose" valor={pose} opciones={POSES} onCambio={setPose} />

        {!sinCamara && !previa && cuenta === null && (
          <div className="fila" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Opciones nombre="Temporizador" valor={temporizador} opciones={TEMPORIZADORES.map((t) => ({ id: t, nombre: `${t} s` }))} onCambio={(t) => {
              setTemporizador(t);
              void ajustesRepo.guardar({ temporizadorFoto: t });
            }} />
            <div className="chips">
              <button type="button" className="chip" onClick={() => setFrontal(!frontal)}>Cambiar cámara</button>
              <button type="button" className="chip" onClick={() => setGuia(!guia)}>{guia ? 'Ocultar guía' : 'Mostrar guía'}</button>
            </div>
          </div>
        )}

        {sinCamara ? (
          <div className="aviso" role="status">No pudimos usar la cámara. Revisá el permiso en Ajustes del iPhone o elegí una foto de la galería.</div>
        ) : (
          <div className="foto-camara">
            <video
              ref={video} playsInline muted autoPlay aria-label="Cámara" className={frontal ? 'espejo' : undefined}
              onPlaying={() => setLista(true)} onLoadedData={(e) => e.currentTarget.videoWidth > 0 && setLista(true)}
            />
            {guia && !previa && (anterior ? (
              <img src={anterior} alt="Foto anterior" className={`foto-capa foto-fantasma${frontal ? ' espejo' : ''}`} />
            ) : (
              <Silueta pose={pose} />
            ))}
            {previa && <img src={previa.url} alt="Foto nueva" className="foto-capa" />}
            {cuenta !== null && (
              <div role="timer" aria-label="Cuenta regresiva" className="foto-cuenta" onClick={cancelarCuenta}>
                {cuenta}
              </div>
            )}
          </div>
        )}

        {previa ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Boton variante="secundario" onClick={descartarPrevia}>Repetir</Boton>
            <Boton onClick={usar} disabled={guardando}>Usar foto</Boton>
          </div>
        ) : (
          <>
            {!sinCamara && (
              <>
                <Boton ancho onClick={disparar} disabled={cuenta !== null || !lista}>Sacar foto</Boton>
              </>
            )}
            {cuenta === null && <label className="boton boton-secundario boton-ancho">
              Elegir de la galería
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = '';
                  if (!archivo) return;
                  try {
                    await mostrarPrevia(await desdeArchivo(archivo));
                  } catch {
                    setError('No se pudo abrir esa imagen.');
                  }
                }}
              />
            </label>}
          </>
        )}

        <label className="campo">
          Fecha
          <input className="entrada" type="date" aria-label="Fecha" max={hoy} value={fecha} onChange={(e) => {
            if (!e.target.value) return;
            setFecha(e.target.value);
            if (fotos) setPose(posesFaltantes(fotos, e.target.value)[0] ?? 'frente');
          }} />
        </label>

        {completas && (
          <div className="aviso aviso-dorado fila-entre" role="status">
            <span>¡Listo! Ya tenés las tres poses de este día.</span>
            <Enlace a="/progreso" className="chip">Ver fotos</Enlace>
          </div>
        )}
        {error && <p className="error" role="alert" style={{ margin: 0 }}>{error}</p>}
        <p className="texto-2" style={{ fontSize: 13, margin: 0 }}>Para comparar mejor: misma luz, misma hora y la misma ropa. Las fotos quedan solo en este iPhone.</p>
      </div>

      {reemplazar && (
        <Dialogo titulo="¿Reemplazarla?" confirmar="Reemplazar" onCancelar={() => setReemplazar(false)} onConfirmar={guardar}>
          Ya hay una foto de {NOMBRE_POSE[pose].toLowerCase()} de ese día.
        </Dialogo>
      )}
    </>
  );
}
