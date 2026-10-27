import { listaCompras } from '../../../core/nutricion/compras';
import { nutricionRepo } from '../../../data/repos/nutricion';
import { Encabezado } from '../../componentes/Encabezado';
import { Tarjeta } from '../../componentes/Tarjeta';
import { useCarga } from '../../datos';
import { ALIMENTOS, PLATOS, cargarNutricion } from '../../nutricion';

async function cargar() {
  const estado = await cargarNutricion();
  if (!estado) return undefined;
  return { grupos: listaCompras(estado.menu.dias, PLATOS, ALIMENTOS), tachados: await nutricionRepo.tachados(estado.semana), semana: estado.semana };
}

export function Compras() {
  const { datos, recargar } = useCarga(cargar);
  if (!datos) return <Encabezado titulo="Lista de compras" atras />;
  const total = datos.grupos.reduce((t, g) => t + g.items.length, 0);
  const hechos = datos.grupos.reduce((t, g) => t + g.items.filter((i) => datos.tachados.includes(i.alimentoId)).length, 0);

  return (
    <>
      <Encabezado titulo="Lista de compras" atras />
      <p className="texto-2" style={{ marginTop: -12 }}>Para toda la semana · {hechos} de {total} comprados</p>
      <div className="pila">
        {datos.grupos.map((g) => (
          <Tarjeta key={g.categoria}>
            <h2 style={{ fontSize: 16, marginBottom: 6 }}>{g.titulo}</h2>
            {g.items.map((i) => {
              const tachado = datos.tachados.includes(i.alimentoId);
              return (
                <label key={i.alimentoId} className="fila" style={{ minHeight: 44, borderTop: '1px solid var(--color-linea)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    aria-label={i.nombre}
                    checked={tachado}
                    onChange={async () => {
                      await nutricionRepo.alternarTachado(datos.semana, i.alimentoId);
                      recargar();
                    }}
                    style={{ width: 22, height: 22, accentColor: '#C9A227', flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, textDecoration: tachado ? 'line-through' : 'none', opacity: tachado ? 0.5 : 1 }}>{i.nombre}</span>
                  <span className="texto-2 numeros" style={{ fontSize: 14, opacity: tachado ? 0.5 : 1 }}>{i.texto}</span>
                </label>
              );
            })}
          </Tarjeta>
        ))}
      </div>
    </>
  );
}
