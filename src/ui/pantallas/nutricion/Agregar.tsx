import { useMemo, useRef, useState, type ReactNode } from 'react';
import { normalizar } from '../../../core/biblioteca';
import { macrosDePlato } from '../../../core/nutricion/platos';
import { macrosDeRegistro, recientes, type Origen } from '../../../core/nutricion/registro';
import { TIPOS_COMIDA, type Producto, type TipoComida } from '../../../core/nutricion/tipos';
import { parsearNumero } from '../../../core/unidades';
import { registroRepo } from '../../../data/repos/registro';
import { Boton } from '../../componentes/Boton';
import { Encabezado } from '../../componentes/Encabezado';
import { useCarga } from '../../datos';
import { ALIMENTOS, PLATOS_LISTA, miles } from '../../nutricion';
import { registrar, textoCantidad, textoPorcionPlato } from '../../registro';
import { volver } from '../../router';
import { Escaner } from './Escaner';

type Pestana = 'recientes' | 'platos' | 'alimentos' | 'codigo';
const PESTANAS: [Pestana, string][] = [['recientes', 'Recientes'], ['platos', 'Platos'], ['alimentos', 'Alimentos'], ['codigo', 'Código']];
const PORCIONES = [0.5, 1, 1.5, 2];
const MAX_RESULTADOS = 40;

export type Eleccion = { origen: Origen; refId: string; nombre: string; gramos?: number };

function coincideBusqueda(texto: string, busqueda: string): boolean {
  const t = normalizar(texto);
  return normalizar(busqueda).split(/\s+/).filter(Boolean).every((p) => t.includes(p));
}

/** Controles para elegir porción (platos) o gramos (alimentos y productos) y agregar. */
export function Confirmar({ eleccion, productos, onAgregar }: { eleccion: Eleccion; productos: Map<string, Producto>; onAgregar: (cantidad: number, porcion?: number) => void }) {
  const esPlato = eleccion.origen === 'plato';
  const [porcion, setPorcion] = useState(1);
  const [gramos, setGramos] = useState(String(eleccion.gramos ?? 100));
  const g = parsearNumero(gramos);
  const valido = esPlato || (g !== null && g > 0 && g <= 5000);
  const cantidad = esPlato ? porcion : g ?? 0;
  const m = valido ? macrosDeRegistro(eleccion.origen, eleccion.refId, cantidad, { platos: new Map(PLATOS_LISTA.map((p) => [p.id, p])), alimentos: ALIMENTOS, productos }) : null;
  return (
    <div className="pila" style={{ gap: 8, padding: '8px 0 4px' }}>
      {esPlato ? (
        <div className="chips" role="group" aria-label="Porción">
          {PORCIONES.map((n) => (
            <button key={n} type="button" className="chip" aria-pressed={porcion === n} onClick={() => setPorcion(n)}>
              {textoPorcionPlato(n)}
            </button>
          ))}
        </div>
      ) : (
        <label className="campo">
          Gramos
          <input className="entrada" inputMode="decimal" aria-label="Gramos" value={gramos} onChange={(e) => setGramos(e.target.value)} />
        </label>
      )}
      <div className="fila-entre">
        <span className="texto-2 numeros" style={{ fontSize: 14 }}>{m ? `${miles(m.kcal)} kcal · ${miles(m.proteina)} g proteína` : 'Revisá los gramos'}</span>
        <Boton disabled={!valido} onClick={() => onAgregar(cantidad, esPlato ? porcion : undefined)}>
          Agregar
        </Boton>
      </div>
    </div>
  );
}

function Fila({ titulo, detalle, abierta, onTocar, children }: { titulo: string; detalle: string; abierta: boolean; onTocar: () => void; children?: ReactNode }) {
  return (
    <li style={{ borderTop: '1px solid var(--color-linea)' }}>
      <button type="button" className="fila-entre" aria-expanded={abierta} onClick={onTocar} style={{ width: '100%', background: 'none', border: 0, padding: '10px 0', textAlign: 'left' }}>
        <span style={{ minWidth: 0 }}>{titulo}</span>
        <span className="texto-2 numeros" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{detalle}</span>
      </button>
      {abierta && children}
    </li>
  );
}

export function Agregar({ fecha, tipo }: { fecha: string; tipo: TipoComida }) {
  const { datos } = useCarga(async () => {
    const [todos, productos] = await Promise.all([registroRepo.todos(), registroRepo.productos()]);
    return { recientes: recientes(todos), productos: new Map(productos.map((p) => [p.id, p])) };
  });
  const [elegida, setElegida] = useState<Pestana | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);
  const enCurso = useRef(false);

  const pestana: Pestana = elegida ?? (datos && datos.recientes.length > 0 ? 'recientes' : 'platos');

  const platos = useMemo(
    () => PLATOS_LISTA.filter((p) => coincideBusqueda(p.nombre, busqueda)).sort((a, b) => Number(b.tipos.includes(tipo)) - Number(a.tipos.includes(tipo))).slice(0, MAX_RESULTADOS),
    [busqueda, tipo],
  );
  const alimentos = useMemo(() => {
    const propios = [...(datos?.productos.values() ?? [])].map((p) => ({ origen: 'producto' as const, id: p.id, nombre: p.marca ? `${p.nombre} (${p.marca})` : p.nombre, kcal: p.kcal, gramos: p.porcionG }));
    const base = [...ALIMENTOS.values()].map((a) => ({ origen: 'alimento' as const, id: a.id, nombre: a.nombre, kcal: a.kcal, gramos: a.unidad?.gramos }));
    return [...propios, ...base].filter((a) => coincideBusqueda(a.nombre, busqueda)).slice(0, MAX_RESULTADOS);
  }, [busqueda, datos]);

  if (!datos) return <Encabezado titulo={`Agregar a ${TIPOS_COMIDA[tipo].toLowerCase()}`} atras />;

  const agregar = async (r: { origen: Origen; refId: string; nombre: string; cantidad: number; porcion?: number }) => {
    if (enCurso.current) return;
    enCurso.current = true;
    let listo = false;
    try {
      listo = await registrar({ fecha, tipo, ...r });
      if (listo) volver();
    } finally {
      // Después de registrar, la pantalla se va: no se libera para que un segundo toque no agregue otra vez.
      if (!listo) enCurso.current = false;
    }
  };

  const cambiarPestana = (p: Pestana) => {
    setElegida(p);
    setAbierta(null);
  };

  return (
    <>
      <Encabezado titulo={`Agregar a ${TIPOS_COMIDA[tipo].toLowerCase()}`} atras />
      <div className="pila">
        <div className="chips" role="tablist" aria-label="Cómo agregar">
          {PESTANAS.map(([id, nombre]) => (
            <button key={id} type="button" role="tab" className="chip" aria-selected={pestana === id} aria-pressed={pestana === id} onClick={() => cambiarPestana(id)}>
              {nombre}
            </button>
          ))}
        </div>

        {(pestana === 'platos' || pestana === 'alimentos') && (
          <input className="entrada" type="search" aria-label="Buscar" placeholder={pestana === 'platos' ? 'Buscar un plato' : 'Buscar un alimento'} value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setAbierta(null); }} />
        )}

        <section className="tarjeta" role="tabpanel">
          {pestana === 'recientes' &&
            (datos.recientes.length === 0 ? (
              <p className="texto-2" style={{ margin: 0 }}>Todavía no registraste nada. Lo que agregues va a aparecer acá para repetirlo de un toque.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {datos.recientes.map((r) => (
                  <li key={r.id} className="fila" style={{ borderTop: '1px solid var(--color-linea)', padding: '8px 0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>{r.nombre}</div>
                      <div className="texto-2 numeros" style={{ fontSize: 13 }}>{textoCantidad(r)} · {miles(r.macros.kcal)} kcal</div>
                    </div>
                    <button type="button" className="chip chip-dorado" aria-label={`Agregar ${r.nombre}`} onClick={() => agregar({ origen: r.origen, refId: r.refId, nombre: r.nombre, cantidad: r.cantidad, porcion: r.porcion })}>
                      +
                    </button>
                  </li>
                ))}
              </ul>
            ))}

          {pestana === 'platos' && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {platos.map((p) => (
                <Fila key={p.id} titulo={p.nombre} detalle={`${miles(macrosDePlato(p, ALIMENTOS).kcal)} kcal`} abierta={abierta === p.id} onTocar={() => setAbierta(abierta === p.id ? null : p.id)}>
                  <Confirmar eleccion={{ origen: 'plato', refId: p.id, nombre: p.nombre }} productos={datos.productos} onAgregar={(cantidad, porcion) => agregar({ origen: 'plato', refId: p.id, nombre: p.nombre, cantidad, porcion })} />
                </Fila>
              ))}
              {platos.length === 0 && <li className="texto-2">No encontramos platos con ese nombre.</li>}
            </ul>
          )}

          {pestana === 'alimentos' && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {alimentos.map((a) => (
                <Fila key={a.origen + a.id} titulo={a.nombre} detalle={`${miles(a.kcal)} kcal / 100 g`} abierta={abierta === a.id} onTocar={() => setAbierta(abierta === a.id ? null : a.id)}>
                  <Confirmar eleccion={{ origen: a.origen, refId: a.id, nombre: a.nombre, gramos: a.gramos }} productos={datos.productos} onAgregar={(cantidad) => agregar({ origen: a.origen, refId: a.id, nombre: a.nombre, cantidad })} />
                </Fila>
              ))}
              {alimentos.length === 0 && <li className="texto-2">No encontramos alimentos con ese nombre. Si es un producto envasado, probá con el código de barras.</li>}
            </ul>
          )}

          {pestana === 'codigo' && <Escaner productos={datos.productos} onAgregar={(r) => agregar(r)} />}
        </section>
      </div>
    </>
  );
}
