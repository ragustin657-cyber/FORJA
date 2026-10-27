import { useRef, useState } from 'react';
import { macrosDePlato } from '../../../core/nutricion/platos';
import { totales, type Registro } from '../../../core/nutricion/registro';
import { TIPOS_COMIDA, type TipoComida } from '../../../core/nutricion/tipos';
import { registroRepo } from '../../../data/repos/registro';
import { Boton } from '../../componentes/Boton';
import { Encabezado } from '../../componentes/Encabezado';
import { IconoBasura } from '../../componentes/Iconos';
import { Tarjeta } from '../../componentes/Tarjeta';
import { useCarga } from '../../datos';
import { ALIMENTOS, DIAS, PLATOS, miles } from '../../nutricion';
import { aFecha, cargarDia, fechaDeHoy, moverDia, registrar, textoCantidad, type DiaRegistro } from '../../registro';
import { Enlace, navegar } from '../../router';
import { BarrasDia } from './BarrasDia';

const PORCIONES: [number, string][] = [[0.5, '½'], [1, '1'], [1.5, '1½']];

function titulo(fecha: string): string {
  const hoy = fechaDeHoy();
  if (fecha === hoy) return 'Hoy';
  if (fecha === moverDia(hoy, -1)) return 'Ayer';
  const d = aFecha(fecha);
  return `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function Item({ r, onBorrar }: { r: Registro; onBorrar: () => void }) {
  return (
    <li className="fila" style={{ borderTop: '1px solid var(--color-linea)', paddingTop: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nombre}</div>
        <div className="texto-2 numeros" style={{ fontSize: 13 }}>
          {textoCantidad(r)} · {miles(r.macros.kcal)} kcal · {miles(r.macros.proteina)} g proteína
        </div>
      </div>
      <button type="button" className="boton-icono" aria-label={`Borrar ${r.nombre}`} onClick={onBorrar}>
        <IconoBasura />
      </button>
    </li>
  );
}

function Comida({ dia, tipo, ocupado, accion }: { dia: DiaRegistro; tipo: TipoComida; ocupado: boolean; accion: (fn: () => Promise<unknown>) => void }) {
  const [porcion, setPorcion] = useState(1);
  const delMenu = dia.menuDia?.comidas.find((c) => c.tipo === tipo && c.platoId);
  const plato = delMenu?.platoId ? PLATOS.get(delMenu.platoId) : undefined;
  const items = dia.registros.filter((r) => r.tipo === tipo);
  const registrado = plato && items.find((r) => r.origen === 'menu' && r.refId === plato.id);
  const m = plato && delMenu ? macrosDePlato(plato, ALIMENTOS, delMenu.factor) : null;

  return (
    <article aria-label={TIPOS_COMIDA[tipo]} className="tarjeta pila" style={{ gap: 10 }}>
      <div className="fila-entre">
        <span className="subtitulo" style={{ margin: 0 }}>{TIPOS_COMIDA[tipo]}</span>
        <Enlace a={`/nutricion/agregar/${dia.fecha}/${tipo}`} className="chip">Agregar</Enlace>
      </div>
      {plato && delMenu && m && (
        <div className="pila" style={{ gap: 8 }}>
          <div>
            <div className="texto-2" style={{ fontSize: 12 }}>Del menú</div>
            <strong>{plato.nombre}</strong>
            <div className="texto-2 numeros" style={{ fontSize: 13 }}>
              <span data-testid="kcal-menu">{miles(m.kcal)} kcal</span> · {miles(m.proteina)} g proteína
            </div>
          </div>
          {registrado ? (
            <Boton variante="secundario" disabled={ocupado} onClick={() => accion(() => registroRepo.borrar(registrado.id))}>
              Registrado ✓
            </Boton>
          ) : (
            <div className="fila" style={{ gap: 8 }}>
              <div className="chips" role="group" aria-label="Porción">
                {PORCIONES.map(([n, t]) => (
                  <button key={n} type="button" className="chip" aria-pressed={porcion === n} onClick={() => setPorcion(n)}>
                    {t}
                  </button>
                ))}
              </div>
              <Boton
                style={{ flex: 1 }}
                disabled={ocupado}
                onClick={() =>
                  accion(() =>
                    registrar({ fecha: dia.fecha, tipo, origen: 'menu', refId: plato.id, cantidad: delMenu.factor * porcion, porcion, nombre: plato.nombre }),
                  )
                }
              >
                La comí
              </Boton>
            </div>
          )}
        </div>
      )}
      {items.length > 0 && (
        <ul aria-label={`Registrado en ${TIPOS_COMIDA[tipo].toLowerCase()}`} style={{ listStyle: 'none', margin: 0, padding: 0 }} className="pila">
          {items.map((r) => (
            <Item key={r.id} r={r} onBorrar={() => accion(() => registroRepo.borrar(r.id))} />
          ))}
        </ul>
      )}
    </article>
  );
}

export function Hoy({ fecha: pedida }: { fecha?: string }) {
  const fecha = pedida ?? fechaDeHoy();
  const { datos, recargar } = useCarga(() => cargarDia(fecha), [fecha]);
  const [ocupado, setOcupado] = useState(false);
  const enCurso = useRef(false);

  // Un toque a la vez: un doble toque no registra dos veces.
  const accion = async (fn: () => Promise<unknown>) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(true);
    try {
      await fn();
    } finally {
      // Se libera recién cuando la pantalla ya muestra lo guardado; si no, un segundo toque vería el botón viejo.
      await recargar();
      enCurso.current = false;
      setOcupado(false);
    }
  };

  const esHoy = fecha >= fechaDeHoy();
  const navegacion = (
    <div className="fila" style={{ gap: 4 }}>
      <button type="button" className="chip" aria-label="Día anterior" onClick={() => navegar(`/nutricion/hoy/${moverDia(fecha, -1)}`)}>‹</button>
      <button type="button" className="chip" aria-label="Día siguiente" disabled={esHoy} onClick={() => navegar(`/nutricion/hoy/${moverDia(fecha, 1)}`)}>›</button>
    </div>
  );

  if (datos === undefined) return <Encabezado titulo={titulo(fecha)} atras accion={navegacion} />;
  if (datos === null) {
    return (
      <>
        <Encabezado titulo={titulo(fecha)} atras />
        <Tarjeta className="pila">
          <p className="texto-2" style={{ margin: 0 }}>Para registrar lo que comés, primero armá tu plan.</p>
          <Boton ancho onClick={() => navegar('/nutricion/plan')}>Armá tu plan</Boton>
        </Tarjeta>
      </>
    );
  }

  const { metas } = datos.estado;
  return (
    <>
      <Encabezado titulo={titulo(fecha)} atras accion={navegacion} />
      <div className="pila">
        <Tarjeta>
          <BarrasDia total={totales(datos.registros)} kcal={metas.kcal} proteina={metas.proteina} />
        </Tarjeta>
        {datos.tipos.map((t) => (
          <Comida key={t} dia={datos} tipo={t} ocupado={ocupado} accion={accion} />
        ))}
      </div>
    </>
  );
}
