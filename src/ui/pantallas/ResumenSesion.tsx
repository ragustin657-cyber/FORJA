import { duracion } from '../../core/formato';
import { calcularRecords, descripcionRecord, detectarRecords } from '../../core/records';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { sesionesRepo } from '../../data/repos/sesiones';
import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';
import { Enlace } from '../router';

async function cargar(id: string) {
  const sesion = await sesionesRepo.porId(id);
  if (!sesion) return null;
  const records: string[] = [];
  for (const ejercicioId of new Set(sesion.series.map((x) => x.ejercicioId))) {
    const previo = (await sesionesRepo.historialConFechas(ejercicioId)).filter((h) => h.fecha < sesion.inicio).map((h) => h.series);
    const nombre = (await ejerciciosRepo.porId(ejercicioId))?.nombre ?? 'Ejercicio';
    for (const r of detectarRecords(calcularRecords(previo), sesion.series.filter((x) => x.ejercicioId === ejercicioId))) {
      records.push(descripcionRecord(nombre, r));
    }
  }
  return { sesion, records };
}

export function ResumenSesion({ id }: { id: string }) {
  const { datos } = useCarga(() => cargar(id), [id]);
  if (!datos) return <Encabezado titulo="Resumen" />;
  const { sesion, records } = datos;
  const hechas = sesion.series.filter((x) => x.completada);
  const volumen = hechas.reduce((t, x) => t + x.peso * x.reps, 0);

  return (
    <>
      <Encabezado titulo="Resumen" />
      <div className="pila">
        <Tarjeta className="pila" style={{ textAlign: 'center' }}>
          <h2 className="titulo" style={{ color: 'var(--color-dorado)' }}>¡Entrenamiento terminado!</h2>
          <p className="texto-2 numeros" style={{ margin: 0 }}>
            {duracion((sesion.fin ?? Date.now()) - sesion.inicio)} · {hechas.length} series · {Math.round(volumen).toLocaleString('es-AR')} kg movidos
          </p>
        </Tarjeta>
        {records.length > 0 && (
          <Tarjeta className="pila" style={{ borderColor: 'rgba(201,162,39,0.45)' }}>
            <h3 style={{ fontSize: 16, color: 'var(--color-dorado)' }}>🏆 Récords de hoy</h3>
            {records.map((r) => (
              <p key={r} style={{ margin: 0, color: 'var(--color-dorado)' }}>Nuevo récord: {r}</p>
            ))}
          </Tarjeta>
        )}
        <Enlace a="/" className="boton boton-primario">Volver al inicio</Enlace>
      </div>
    </>
  );
}
