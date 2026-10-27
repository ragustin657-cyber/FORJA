import { duracion } from '../../core/formato';
import { calcularRecords, descripcionRecord, detectarRecords } from '../../core/records';
import { useState } from 'react';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { rutinasRepo } from '../../data/repos/rutinas';
import type { Sesion } from '../../data/tipos';
import { Boton } from '../componentes/Boton';
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
  const nombres: Record<string, string> = {};
  for (const c of sesion.cambios ?? []) {
    for (const id of [c.de, c.a]) nombres[id] = (await ejerciciosRepo.porId(id))?.nombre ?? 'Ejercicio';
  }
  return { sesion, records, nombres };
}

/** Pasa los cambios de la sesión ("está ocupada") a la rutina, conservando series, repeticiones y descanso. */
async function dejarEnRutina(sesion: Sesion) {
  const rutina = await rutinasRepo.porId(sesion.rutinaId);
  if (!rutina) return;
  const dias = rutina.dias.map((d) =>
    d.id !== sesion.diaId
      ? d
      : { ...d, ejercicios: d.ejercicios.map((e) => ({ ...e, ejercicioId: sesion.cambios?.find((c) => c.de === e.ejercicioId)?.a ?? e.ejercicioId })) },
  );
  await rutinasRepo.guardar({ ...rutina, dias });
}

function CambiosDeHoy({ sesion, nombres }: { sesion: Sesion; nombres: Record<string, string> }) {
  const [listo, setListo] = useState(false);
  return (
    <section aria-label="Cambios de hoy" className="tarjeta pila">
      {sesion.cambios!.map((c) => (
        <p key={c.de} style={{ margin: 0 }}>{`Cambiaste ${nombres[c.de]} por ${nombres[c.a]}.`}</p>
      ))}
      {listo ? (
        <p className="texto-2" role="status" style={{ margin: 0 }}>Listo, tu rutina quedó actualizada.</p>
      ) : (
        <>
          <p className="texto-2" style={{ margin: 0 }}>¿Lo dejamos así en tu rutina para la próxima?</p>
          <Boton
            variante="secundario"
            onClick={async () => {
              await dejarEnRutina(sesion);
              setListo(true);
            }}
          >
            Dejarlo en la rutina
          </Boton>
        </>
      )}
    </section>
  );
}

export function ResumenSesion({ id }: { id: string }) {
  const { datos } = useCarga(() => cargar(id), [id]);
  if (!datos) return <Encabezado titulo="Resumen" />;
  const { sesion, records, nombres } = datos;
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
        {sesion.cambios && sesion.cambios.length > 0 && <CambiosDeHoy sesion={sesion} nombres={nombres} />}
        <Enlace a="/" className="boton boton-primario">Volver al inicio</Enlace>
      </div>
    </>
  );
}
