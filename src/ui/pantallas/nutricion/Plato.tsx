import { ingredientesEscalados, macrosDePlato } from '../../../core/nutricion/platos';
import { textoPorcion } from '../../../core/nutricion/compras';
import { TIPOS_COMIDA } from '../../../core/nutricion/tipos';
import { Encabezado } from '../../componentes/Encabezado';
import { Tarjeta } from '../../componentes/Tarjeta';
import { useCarga } from '../../datos';
import { ALIMENTOS, DIAS, PLATOS, cargarNutricion, miles } from '../../nutricion';

export function Plato({ dia, comida }: { dia: number; comida: number }) {
  const { datos } = useCarga(cargarNutricion);
  const c = datos?.menu.dias[dia]?.comidas[comida];
  const plato = c?.platoId ? PLATOS.get(c.platoId) : undefined;
  if (!c || !plato) return <Encabezado titulo="Plato" atras />;
  const m = macrosDePlato(plato, ALIMENTOS, c.factor);

  return (
    <>
      <Encabezado titulo="" atras />
      <div className="pila">
        <div>
          <div className="texto-2" style={{ fontSize: 13 }}>{DIAS[dia]} · {TIPOS_COMIDA[c.tipo]}</div>
          <h2 className="titulo" style={{ fontSize: 24 }}>{plato.nombre}</h2>
        </div>
        <Tarjeta>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center' }}>
            {[['Calorías', `${miles(m.kcal)}`], ['Proteína', `${miles(m.proteina)} g`], ['Grasas', `${miles(m.grasas)} g`], ['Carbos', `${miles(m.carbos)} g`]].map(([n, v]) => (
              <div key={n}>
                <div className="texto-2" style={{ fontSize: 12 }}>{n}</div>
                <strong className="numeros" style={{ color: n === 'Calorías' ? 'var(--color-dorado)' : undefined }}>{v}</strong>
              </div>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Ingredientes</h3>
          <ul aria-label="Ingredientes" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {ingredientesEscalados(plato, c.factor).map((i) => {
              const a = ALIMENTOS.get(i.alimentoId);
              return (
                <li key={i.alimentoId} className="fila-entre" style={{ padding: '6px 0', borderTop: '1px solid var(--color-linea)' }}>
                  <span>{a?.nombre ?? i.alimentoId}</span>
                  <span className="texto-2 numeros">{textoPorcion(i.gramos, a?.unidad)}</span>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Preparación</h3>
          <ol aria-label="Preparación" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plato.pasos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </Tarjeta>
      </div>
    </>
  );
}
