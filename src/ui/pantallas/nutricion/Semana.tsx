import { useState } from 'react';
import { alternativas, reemplazarComida, totalesDia } from '../../../core/nutricion/menu';
import { TIPOS_COMIDA } from '../../../core/nutricion/tipos';
import { nutricionRepo } from '../../../data/repos/nutricion';
import { Boton } from '../../componentes/Boton';
import { Encabezado } from '../../componentes/Encabezado';
import { Tarjeta } from '../../componentes/Tarjeta';
import { useCarga } from '../../datos';
import { ALIMENTOS, DIAS, PLATOS, cargarNutricion, diaDeHoy, entradaMenu, generarMenu, miles } from '../../nutricion';
import { ComidaFila } from './ComidaFila';

export function Semana() {
  const { datos, recargar } = useCarga(cargarNutricion);
  const [dia, setDia] = useState(diaDeHoy);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (!datos) return <Encabezado titulo="Semana" atras />;
  const { menu, perfil, peso, metas, semana } = datos;
  const total = totalesDia(menu.dias[dia], PLATOS, ALIMENTOS);

  if (cambiando !== null) {
    const actual = menu.dias[dia].comidas[cambiando];
    const opciones = alternativas(entradaMenu(perfil, metas, menu.semilla), menu.dias, dia, cambiando);
    return (
      <>
        <Encabezado titulo={`Cambiar ${TIPOS_COMIDA[actual.tipo].toLowerCase()}`} accion={<Boton variante="secundario" onClick={() => setCambiando(null)}>Cancelar</Boton>} />
        <ul aria-label="Alternativas" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opciones.map((o) => {
            const nombre = PLATOS.get(o.platoId)!.nombre;
            return (
              <li key={o.platoId}>
                <button
                  type="button"
                  className="tarjeta"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  aria-label={`Elegir ${nombre}`}
                  onClick={async () => {
                    await nutricionRepo.guardarMenu({ ...menu, dias: reemplazarComida(menu.dias, dia, cambiando, o.platoId, o.factor) });
                    setCambiando(null);
                    recargar();
                  }}
                >
                  <strong>{nombre}</strong>
                  <div className="texto-2 numeros" style={{ fontSize: 13 }}>
                    {miles(o.macros.kcal)} kcal · {miles(o.macros.proteina)} g proteína
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      <Encabezado titulo="Semana" atras />
      <div className="pila" aria-busy={ocupado}>
        <div role="tablist" aria-label="Días" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {DIAS.map((d, i) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={i === dia}
              aria-label={d.slice(0, 3)}
              className="chip"
              aria-pressed={i === dia}
              style={{ padding: 0, justifyContent: 'center', minHeight: 44 }}
              onClick={() => setDia(i)}
            >
              {d.slice(0, 2)}
            </button>
          ))}
        </div>
        <Tarjeta className="pila" style={{ gap: 10 }}>
          <div className="fila-entre">
            <strong>{DIAS[dia]}</strong>
            <span className="texto-2 numeros" data-testid="total-dia" style={{ fontSize: 14 }}>
              Total del día: {miles(total.kcal)} kcal
            </span>
          </div>
          <div className="texto-2 numeros" style={{ fontSize: 13 }}>
            Proteína {miles(total.proteina)} g · Grasas {miles(total.grasas)} g · Carbohidratos {miles(total.carbos)} g
          </div>
          {menu.dias[dia].comidas.map((c, i) => (
            <ComidaFila key={i} comida={c} dia={dia} indice={i} onCambiar={() => setCambiando(i)} />
          ))}
        </Tarjeta>
        <Boton
          variante="secundario"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            await generarMenu(perfil, peso, semana);
            setOcupado(false);
            recargar();
          }}
        >
          Rehacer semana
        </Boton>
      </div>
    </>
  );
}
