import { useEffect, useRef, useState } from 'react';
import { decodificarLuminancia, limpiarCodigo } from '../../../core/codigo';
import { validarEtiqueta } from '../../../core/nutricion/productos';
import type { Origen } from '../../../core/nutricion/registro';
import type { Producto } from '../../../core/nutricion/tipos';
import { parsearNumero } from '../../../core/unidades';
import { registroRepo } from '../../../data/repos/registro';
import { Boton } from '../../componentes/Boton';
import { miles } from '../../nutricion';
import { buscarEnOFF } from '../../openfoodfacts';
import { Confirmar } from './Agregar';

type AlAgregar = (r: { origen: Origen; refId: string; nombre: string; cantidad: number }) => void;
type Estado =
  | { paso: 'leer' }
  | { paso: 'buscando'; codigo: string }
  | { paso: 'encontrado'; producto: Producto }
  | { paso: 'etiqueta'; codigo: string; motivo: string };

const INTERVALO = 200;
const ANCHO_ANALISIS = 640;

/** Muestra la cámara trasera y analiza un cuadro cada 200 ms hasta leer un código. */
function Camara({ onCodigo }: { onCodigo: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let flujo: MediaStream | null = null;
    let reloj: ReturnType<typeof setInterval> | undefined;
    let vivo = true;
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });

    const analizar = () => {
      const v = video.current;
      if (!v || !ctx || v.readyState < 2 || !v.videoWidth) return;
      const escala = Math.min(1, ANCHO_ANALISIS / v.videoWidth);
      const w = Math.round(v.videoWidth * escala);
      const h = Math.round(v.videoHeight * escala);
      lienzo.width = w;
      lienzo.height = h;
      ctx.drawImage(v, 0, 0, w, h);
      const rgba = ctx.getImageData(0, 0, w, h).data;
      const lum = new Uint8ClampedArray(w * h);
      for (let i = 0, j = 0; j < lum.length; i += 4, j++) lum[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
      const codigo = decodificarLuminancia(lum, w, h);
      if (codigo && vivo) {
        vivo = false;
        clearInterval(reloj);
        flujo?.getTracks().forEach((t) => t.stop());
        navigator.vibrate?.(80);
        onCodigo(codigo);
      }
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('sin cámara');
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        if (!vivo || !video.current) {
          flujo.getTracks().forEach((t) => t.stop());
          return;
        }
        video.current.srcObject = flujo;
        await video.current.play().catch(() => undefined);
        reloj = setInterval(analizar, INTERVALO);
      } catch {
        if (vivo) setError(true);
      }
    })();

    return () => {
      vivo = false;
      clearInterval(reloj);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [onCodigo]);

  if (error) {
    return <div className="aviso" role="status" style={{ fontSize: 14 }}>No pudimos usar la cámara. Escribí el número que está debajo de las barras.</div>;
  }
  return (
    <div className="camara">
      <video ref={video} playsInline muted autoPlay aria-label="Cámara" />
      <span className="camara-guia" aria-hidden="true" />
      <p className="texto-2" style={{ fontSize: 13, margin: '6px 0 0', textAlign: 'center' }}>Apuntá al código de barras del envase.</p>
    </div>
  );
}

function Etiqueta({ codigo, motivo, onAgregar }: { codigo: string; motivo: string; onAgregar: AlAgregar }) {
  const [v, setV] = useState({ nombre: '', kcal: '', proteina: '', grasas: '', carbos: '', gramos: '100' });
  const [errores, setErrores] = useState<string[]>([]);
  const campo = (clave: keyof typeof v, etiqueta: string, modo: 'decimal' | 'text' = 'decimal') => (
    <label className="campo">
      {etiqueta}
      <input className="entrada" inputMode={modo} aria-label={etiqueta} value={v[clave]} onChange={(e) => setV({ ...v, [clave]: e.target.value })} />
    </label>
  );

  const guardar = async () => {
    const etiqueta = { nombre: v.nombre, kcal: parsearNumero(v.kcal), proteina: parsearNumero(v.proteina), grasas: parsearNumero(v.grasas), carbos: parsearNumero(v.carbos) };
    const gramos = parsearNumero(v.gramos);
    const lista = validarEtiqueta(etiqueta);
    if (gramos === null || gramos <= 0 || gramos > 5000) lista.push('Revisá los gramos que comiste');
    setErrores(lista);
    if (lista.length) return;
    const producto: Producto = { id: codigo, nombre: etiqueta.nombre.trim(), kcal: etiqueta.kcal!, proteina: etiqueta.proteina!, grasas: etiqueta.grasas!, carbos: etiqueta.carbos!, origen: 'manual' };
    await registroRepo.guardarProducto(producto);
    onAgregar({ origen: 'producto', refId: producto.id, nombre: producto.nombre, cantidad: gramos! });
  };

  return (
    <div className="pila">
      <div className="aviso aviso-dorado" role="status" style={{ fontSize: 14 }}>{motivo}</div>
      <strong>Cargá los datos de la etiqueta</strong>
      <span className="texto-2" style={{ fontSize: 13 }}>Código {codigo}. Valores cada 100 g.</span>
      {campo('nombre', 'Nombre', 'text')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {campo('kcal', 'Calorías (kcal)')}
        {campo('proteina', 'Proteínas (g)')}
        {campo('grasas', 'Grasas (g)')}
        {campo('carbos', 'Carbohidratos (g)')}
      </div>
      {campo('gramos', 'Gramos que comiste')}
      {errores.length > 0 && (
        <ul className="aviso" role="alert" style={{ margin: 0, paddingLeft: 28, fontSize: 14 }}>
          {errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <Boton ancho onClick={guardar}>Guardar y agregar</Boton>
    </div>
  );
}

export function Escaner({ productos, onAgregar }: { productos: Map<string, Producto>; onAgregar: AlAgregar }) {
  const [estado, setEstado] = useState<Estado>({ paso: 'leer' });
  const [numero, setNumero] = useState('');
  const [aviso, setAviso] = useState('');

  const buscar = async (codigo: string) => {
    setEstado({ paso: 'buscando', codigo });
    const guardado = await registroRepo.producto(codigo);
    if (guardado) return setEstado({ paso: 'encontrado', producto: guardado });
    try {
      const producto = await buscarEnOFF(codigo);
      if (producto) {
        await registroRepo.guardarProducto(producto);
        setEstado({ paso: 'encontrado', producto });
      } else {
        setEstado({ paso: 'etiqueta', codigo, motivo: 'No encontramos este producto, o no tiene la información nutricional.' });
      }
    } catch {
      setEstado({ paso: 'etiqueta', codigo, motivo: 'No pudimos buscarlo (¿estás sin internet?). Podés cargar los datos de la etiqueta.' });
    }
  };

  const alLeer = useRef((codigo: string) => void buscar(codigo)).current;

  if (estado.paso === 'buscando') return <p className="texto-2" role="status" style={{ margin: 0 }}>Buscando el código {estado.codigo}…</p>;
  if (estado.paso === 'etiqueta') return <Etiqueta codigo={estado.codigo} motivo={estado.motivo} onAgregar={onAgregar} />;
  if (estado.paso === 'encontrado') {
    const p = estado.producto;
    return (
      <div className="pila" style={{ gap: 6 }}>
        <div>
          <strong>{p.nombre}</strong>
          {p.marca && <div className="texto-2" style={{ fontSize: 13 }}>{p.marca}</div>}
          <div className="texto-2 numeros" style={{ fontSize: 13 }}>
            Cada 100 g: {miles(p.kcal)} kcal · {miles(p.proteina)} g proteína · {miles(p.grasas)} g grasas · {miles(p.carbos)} g carbohidratos
          </div>
        </div>
        <Confirmar
          eleccion={{ origen: 'producto', refId: p.id, nombre: p.nombre, gramos: p.porcionG }}
          productos={new Map([...productos, [p.id, p]])}
          onAgregar={(cantidad) => onAgregar({ origen: 'producto', refId: p.id, nombre: p.nombre, cantidad })}
        />
        <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setEstado({ paso: 'leer' })}>Escanear otro</button>
      </div>
    );
  }

  return (
    <div className="pila">
      <Camara onCodigo={alLeer} />
      <form
        className="pila"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          const codigo = limpiarCodigo(numero);
          if (!codigo) return setAviso('Revisá el número: tiene que tener 8, 12 o 13 dígitos.');
          setAviso('');
          void buscar(codigo);
        }}
      >
        <label className="campo">
          Número del código
          <div className="fila" style={{ gap: 8 }}>
            <input className="entrada" inputMode="numeric" aria-label="Número del código" placeholder="7790070411716" value={numero} onChange={(e) => setNumero(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
            <Boton type="submit">Buscar</Boton>
          </div>
        </label>
        {aviso && <span role="alert" style={{ color: 'var(--color-bordo-claro)', fontSize: 14 }}>{aviso}</span>}
      </form>
    </div>
  );
}
