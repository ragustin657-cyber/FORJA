import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { paresParaComparar, POSES, type Foto, type Pose } from '../../../core/cuerpo/fotos';
import { numero } from '../../../core/formato';
import { cuerpoRepo } from '../../../data/repos/cuerpo';
import { nutricionRepo } from '../../../data/repos/nutricion';
import { Encabezado } from '../../componentes/Encabezado';
import { useCarga } from '../../datos';
import { fechaLarga, useImagen } from '../../fotos';

type Vista = 'lado' | 'deslizador';

function Opciones<T extends string>({ nombre, valor, opciones, onCambio }: { nombre: string; valor: T; opciones: { id: T; nombre: string }[]; onCambio: (v: T) => void }) {
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

function Deslizador({ antes, despues }: { antes: string; despues: string }) {
  const [valor, setValor] = useState(50);
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 && e.type === 'pointermove') return;
    const r = e.currentTarget.getBoundingClientRect();
    setValor(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))));
  };
  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setValor((v) => Math.max(0, v - 5));
    if (e.key === 'ArrowRight') setValor((v) => Math.min(100, v + 5));
  };
  return (
    <div className="foto-deslizador" onPointerDown={mover} onPointerMove={mover}>
      <img src={despues} alt="Después" />
      <img src={antes} alt="Antes" style={{ clipPath: `inset(0 ${100 - valor}% 0 0)` }} />
      <div
        role="slider" tabIndex={0} aria-label="Antes y después" aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor}
        className="foto-divisor" style={{ left: `${valor}%` }} onKeyDown={teclas}
      />
    </div>
  );
}

export function Comparar() {
  const { datos } = useCarga(async () => ({ fotos: await cuerpoRepo.fotos(), pesos: await nutricionRepo.pesos() }));
  const [pose, setPose] = useState<Pose>('frente');
  const [vista, setVista] = useState<Vista>('lado');
  const [elegidas, setElegidas] = useState<{ antes?: string; despues?: string }>({});

  if (!datos) return <Encabezado titulo="Comparar" atras />;
  const fechas = [...new Set(datos.fotos.map((f) => f.fecha))].sort();
  const porDefecto = paresParaComparar(datos.fotos, 'frente') ?? { antes: fechas[0], despues: fechas[fechas.length - 1] };
  const antes = elegidas.antes ?? porDefecto.antes;
  const despues = elegidas.despues ?? porDefecto.despues;
  const buscar = (fecha: string): Foto | undefined => datos.fotos.find((f) => f.fecha === fecha && f.pose === pose);
  const kg = (fecha: string) => datos.pesos.find((p) => p.id === fecha)?.kg;
  const leyenda = (fecha: string) => (kg(fecha) !== undefined ? `${fechaLarga(fecha)} · ${numero(kg(fecha)!)} kg` : fechaLarga(fecha));

  const selector = (etiqueta: string, valor: string, cambiar: (v: string) => void) => (
    <label className="campo" style={{ flex: 1 }}>
      {etiqueta}
      <select className="entrada" aria-label={etiqueta} value={valor} onChange={(e) => cambiar(e.target.value)}>
        {fechas.map((f) => (
          <option key={f} value={f}>{fechaLarga(f)}</option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <Encabezado titulo="Comparar" atras />
      <div className="pila">
        <Opciones nombre="Pose" valor={pose} opciones={POSES} onCambio={setPose} />
        <div className="fila" style={{ gap: 8 }}>
          {selector('Antes', antes, (v) => setElegidas({ ...elegidas, antes: v, despues }))}
          {selector('Después', despues, (v) => setElegidas({ ...elegidas, antes, despues: v }))}
        </div>
        <Opciones nombre="Vista" valor={vista} opciones={[{ id: 'lado', nombre: 'Lado a lado' }, { id: 'deslizador', nombre: 'Deslizador' }]} onCambio={setVista} />
        <Comparacion antes={buscar(antes)} despues={buscar(despues)} fechas={[antes, despues]} pose={pose} vista={vista} leyenda={leyenda} />
      </div>
    </>
  );
}

function Comparacion({ antes, despues, fechas, pose, vista, leyenda }: {
  antes?: Foto; despues?: Foto; fechas: [string, string]; pose: Pose; vista: Vista; leyenda: (f: string) => string;
}) {
  const urlAntes = useImagen(antes?.id, 'imagen', antes?.creado);
  const urlDespues = useImagen(despues?.id, 'imagen', despues?.creado);
  const nombre = POSES.find((p) => p.id === pose)!.nombre.toLowerCase();
  const faltan = [antes ? null : fechas[0], despues ? null : fechas[1]].filter((f): f is string => f !== null);
  if (faltan.length) {
    return (
      <div className="pila">
        {[...new Set(faltan)].map((f) => (
          <div key={f} className="aviso" role="status">No hay foto de {nombre} del {fechaLarga(f)}.</div>
        ))}
      </div>
    );
  }
  if (!urlAntes || !urlDespues) return null;
  if (vista === 'deslizador') {
    return (
      <>
        <Deslizador antes={urlAntes} despues={urlDespues} />
        <div className="fila-entre texto-2" style={{ fontSize: 13 }}>
          <span>{leyenda(fechas[0])}</span>
          <span>{leyenda(fechas[1])}</span>
        </div>
      </>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {([[urlAntes, fechas[0]], [urlDespues, fechas[1]]] as const).map(([url, f], i) => (
        <figure key={i} className="foto-grande" style={{ margin: 0 }}>
          <img src={url} alt={`Foto del ${fechaLarga(f)}`} />
          <figcaption className="texto-2" style={{ fontSize: 13 }}>{leyenda(f)}</figcaption>
        </figure>
      ))}
    </div>
  );
}
