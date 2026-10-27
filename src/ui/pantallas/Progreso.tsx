import { numero } from '../../core/formato';
import { promedioMovil } from '../../core/nutricion/peso';
import { calcularRecords } from '../../core/records';
import { nutricionRepo } from '../../data/repos/nutricion';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { sesionesRepo } from '../../data/repos/sesiones';
import { Encabezado } from '../componentes/Encabezado';
import { GraficoLinea } from '../componentes/GraficoLinea';
import { Miniatura } from '../componentes/SelectorEjercicios';
import { useCarga } from '../datos';
import { Enlace } from '../router';

function PesoCorporal() {
  const { datos: pesos } = useCarga(() => nutricionRepo.pesos());
  if (!pesos || pesos.length === 0) return null;
  const tendencia = promedioMovil(pesos);
  return (
    <section aria-label="Peso corporal" className="tarjeta pila" style={{ marginBottom: 12 }}>
      <span className="subtitulo" style={{ margin: 0 }}>Peso corporal</span>
      {pesos.length < 2 ? (
        <p className="texto-2" style={{ margin: 0 }}>
          Último peso: {numero(pesos[0].kg)} kg. Pesate al menos dos veces para ver cómo evoluciona.
        </p>
      ) : (
        <>
          <GraficoLinea
            titulo="Peso corporal"
            unidad="kg"
            puntos={pesos.map((p, i) => ({
              x: p.fecha,
              y: p.kg,
              etiqueta: new Date(p.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
              detalle: `${numero(p.kg)} kg · tendencia ${numero(tendencia[i].kg)} kg`,
            }))}
            tendencia={tendencia.map((t) => t.kg)}
          />
          <span className="texto-2" style={{ fontSize: 12 }}>Línea punteada: promedio de los últimos 7 días.</span>
        </>
      )}
    </section>
  );
}

export function Progreso() {
  const { datos } = useCarga(async () => {
    const ids = await sesionesRepo.ejerciciosConHistorial();
    const filas = await Promise.all(
      ids.map(async (id) => ({
        ejercicio: await ejerciciosRepo.porId(id),
        records: calcularRecords(await sesionesRepo.historialDeEjercicio(id)),
      })),
    );
    return filas.filter((f) => f.ejercicio).sort((a, b) => a.ejercicio!.nombre.localeCompare(b.ejercicio!.nombre, 'es'));
  });

  return (
    <>
      <Encabezado titulo="Progreso" />
      <PesoCorporal />
      {datos && datos.length === 0 && (
        <div className="tarjeta vacio">Cuando termines tu primer entrenamiento, vas a ver acá cómo evoluciona tu fuerza.</div>
      )}
      <div className="pila">
        {datos?.map(({ ejercicio, records }) => (
          <Enlace key={ejercicio!.id} a={'/progreso/ejercicio/' + encodeURIComponent(ejercicio!.id)} className="tarjeta fila" style={{ padding: 10 }}>
            <Miniatura e={ejercicio!} tam={48} />
            <span style={{ flex: 1 }}>
              <strong>{ejercicio!.nombre}</strong>
              <br />
              <span className="texto-2" style={{ fontSize: 13 }}>
                {records.mejorE1rm ? `Fuerza estimada: ${numero(records.mejorE1rm)} kg` : 'Sin datos para estimar la fuerza'}
              </span>
            </span>
            <span className="texto-2" aria-hidden>›</span>
          </Enlace>
        ))}
      </div>
    </>
  );
}
