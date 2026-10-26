import { numero } from '../../core/formato';
import { calcularRecords } from '../../core/records';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { sesionesRepo } from '../../data/repos/sesiones';
import { Encabezado } from '../componentes/Encabezado';
import { Miniatura } from '../componentes/SelectorEjercicios';
import { useCarga } from '../datos';
import { Enlace } from '../router';

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
