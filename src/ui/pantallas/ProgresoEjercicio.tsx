import { kg, numero } from '../../core/formato';
import { calcularRecords, puntosDeProgreso } from '../../core/records';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { sesionesRepo } from '../../data/repos/sesiones';
import { Encabezado } from '../componentes/Encabezado';
import { GraficoLinea } from '../componentes/GraficoLinea';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';

const fecha = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

export function ProgresoEjercicio({ id }: { id: string }) {
  const { datos } = useCarga(async () => {
    const [ejercicio, historial] = await Promise.all([ejerciciosRepo.porId(id), sesionesRepo.historialConFechas(id)]);
    return { ejercicio, historial };
  }, [id]);
  if (!datos) return <Encabezado titulo="Progreso" atras />;

  const { ejercicio, historial } = datos;
  const puntos = puntosDeProgreso(historial);
  const records = calcularRecords(historial.map((h) => h.series));
  const mejoresReps = Object.entries(records.repsPorPeso)
    .map(([peso, reps]) => ({ peso: Number(peso), reps }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 5);

  return (
    <>
      <Encabezado titulo={ejercicio?.nombre ?? 'Progreso'} atras />
      <div className="pila">
        <Tarjeta>
          <h2 style={{ fontSize: 16, marginBottom: 4 }}>Fuerza estimada (1RM)</h2>
          <p className="texto-2" style={{ fontSize: 13, marginTop: 0 }}>Cuánto podrías levantar a una repetición, según tu mejor serie de cada día.</p>
          {puntos.length < 2 ? (
            <p className="vacio" style={{ padding: '16px 0' }}>Necesitás al menos 2 sesiones para ver el gráfico.</p>
          ) : (
            <GraficoLinea
              titulo="Gráfico de fuerza estimada"
              unidad="kg"
              puntos={puntos.map((p) => ({ x: p.fecha, y: p.e1rm, etiqueta: `${fecha(p.fecha)} · ${kg(p.peso)} × ${p.reps}`, detalle: `${numero(p.e1rm)} kg` }))}
            />
          )}
        </Tarjeta>

        <Tarjeta className="pila">
          <h2 style={{ fontSize: 16 }}>Récords</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="texto-2" style={{ fontSize: 13 }}>Mayor peso</div>
              <strong className="numeros" style={{ fontSize: 22, color: 'var(--color-dorado)' }}>{records.mayorPeso ? kg(records.mayorPeso) : '—'}</strong>
            </div>
            <div>
              <div className="texto-2" style={{ fontSize: 13 }}>Fuerza estimada</div>
              <strong className="numeros" style={{ fontSize: 22, color: 'var(--color-dorado)' }}>{records.mejorE1rm ? `${numero(records.mejorE1rm)} kg` : '—'}</strong>
            </div>
          </div>
          {mejoresReps.length > 0 && (
            <div>
              <div className="texto-2" style={{ fontSize: 13, marginBottom: 6 }}>Más repeticiones por peso</div>
              {mejoresReps.map((r) => (
                <div key={r.peso} className="fila-entre numeros" style={{ padding: '4px 0', borderTop: '1px solid var(--color-linea)' }}>
                  <span>{kg(r.peso)}</span>
                  <span>{r.reps} reps</span>
                </div>
              ))}
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
