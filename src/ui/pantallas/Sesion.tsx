import { useEffect, useState } from 'react';
import { duracion, kg } from '../../core/formato';
import { reducirSesion, resumenSeries, textoSugerencia, type Accion } from '../../core/sesion';
import { ajustesRepo } from '../../data/repos/ajustes';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { rutinasRepo } from '../../data/repos/rutinas';
import { sesionesRepo } from '../../data/repos/sesiones';
import type { DiaRutina, Ejercicio, Sesion as TSesion } from '../../data/tipos';
import { infoEjercicio, semanaDeRutina, sugerenciaDeSemana, type InfoEjercicio } from '../acciones';
import { textoSemana } from '../plan';
import { diaDeSemana } from '../../core/planes';
import { Boton } from '../componentes/Boton';
import { PanelAlternativas } from '../componentes/PanelAlternativas';
import { PanelTiempo } from '../componentes/PanelTiempo';
import type { EjercicioEnDia } from '../../data/tipos';
import { Encabezado } from '../componentes/Encabezado';
import { IconoCheck } from '../componentes/Iconos';
import { Miniatura } from '../componentes/SelectorEjercicios';
import { Stepper } from '../componentes/Stepper';
import { Temporizador } from '../componentes/Temporizador';
import { Enlace, navegar } from '../router';
import { desbloquearAudio } from '../sonido';

type Contexto = {
  dia: DiaRutina | undefined;
  ejercicios: Record<string, Ejercicio>;
  info: Record<string, InfoEjercicio>;
  incremento: number;
  semana: Awaited<ReturnType<typeof semanaDeRutina>>;
};

async function cargarContexto(s: TSesion): Promise<Contexto> {
  const rutina = await rutinasRepo.porId(s.rutinaId);
  // La semana se calcula con el inicio de la sesión: si cruza la medianoche del domingo, no cambia.
  const semana = await semanaDeRutina(s.rutinaId, s.inicio);
  const incremento = (await ajustesRepo.obtener()).incrementoKg;
  const diaBase = rutina?.dias.find((d) => d.id === s.diaId);
  // Con plan, la sugerencia se calcula con las series de esa semana (igual que al crear la sesión).
  const dia = diaBase && semana ? diaDeSemana(diaBase, semana.semanaBloque) : diaBase;
  const ids = [...new Set(s.series.map((x) => x.ejercicioId))];
  const ejercicios: Record<string, Ejercicio> = {};
  const info: Record<string, InfoEjercicio> = {};
  for (const id of ids) {
    const e = await ejerciciosRepo.porId(id);
    if (e) ejercicios[id] = e;
    const enDia = dia?.ejercicios.find((x) => x.ejercicioId === id) ?? { ejercicioId: id, series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 };
    const i = await infoEjercicio(enDia);
    info[id] = { ...i, sugerencia: sugerenciaDeSemana(i.sugerencia, semana?.descarga ?? false, incremento) };
  }
  return { dia, ejercicios, info, incremento, semana };
}

export function Sesion() {
  const [sesion, setSesion] = useState<TSesion | null | undefined>(undefined);
  const [ctx, setCtx] = useState<Contexto | null>(null);
  const [descansoHasta, setDescansoHasta] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [pocoTiempo, setPocoTiempo] = useState(false);
  const [, setTic] = useState(0);

  useEffect(() => {
    sesionesRepo.enCurso().then(async (s) => {
      setSesion(s ?? null);
      if (s) setCtx(await cargarContexto(s));
    });
    const t = setInterval(() => setTic((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (sesion === undefined || (sesion && !ctx)) return <Encabezado titulo="Entrenamiento" />;
  if (sesion === null || !ctx) {
    return (
      <>
        <Encabezado titulo="Entrenamiento" />
        <div className="tarjeta vacio">
          <p style={{ marginTop: 0 }}>No hay ningún entrenamiento en curso.</p>
          <Enlace a="/entrenar" className="boton boton-primario">Elegir una rutina</Enlace>
        </div>
      </>
    );
  }

  const actual = sesion;
  const contexto = ctx;

  /** Parámetros del día para un ejercicio, también si reemplaza a otro ("está ocupada"). */
  function parametros(ejercicioId: string): EjercicioEnDia {
    const original = actual.cambios?.find((c) => c.a === ejercicioId)?.de ?? ejercicioId;
    const enDia = contexto.dia?.ejercicios.find((x) => x.ejercicioId === original);
    return { ...(enDia ?? { series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }), ejercicioId };
  }

  function despachar(a: Accion) {
    const nueva = reducirSesion(actual, a);
    setSesion(nueva);
    void sesionesRepo.guardar(nueva);
    return nueva;
  }

  function completar(ejercicioId: string, numero: number) {
    desbloquearAudio();
    const sinPeso = contexto.ejercicios[ejercicioId]?.equipo === 'body only';
    const nueva = despachar({ tipo: 'completar', ejercicioId, numero, sinPeso });
    const hecha = nueva.series.find((x) => x.ejercicioId === ejercicioId && x.numero === numero);
    if (!hecha?.completada) {
      setAviso('Cargá el peso y las repeticiones antes de completar la serie.');
      return;
    }
    setAviso(null);
    const descanso = Math.min(parametros(ejercicioId).descansoSeg, actual.descansoMaxSeg ?? Infinity);
    if (descanso > 0) setDescansoHasta(Date.now() + descanso * 1000);
  }

  async function terminar() {
    const hechas = actual.series.filter((x) => x.completada).length;
    if (hechas === 0) {
      if (!confirm('No completaste ninguna serie. ¿Descartar este entrenamiento?')) return;
      await sesionesRepo.descartar(actual.id);
      navegar('/entrenar');
      return;
    }
    await sesionesRepo.finalizar(actual.id, Date.now());
    navegar('/entrenar/resumen/' + actual.id);
  }

  const ids = [...new Set(actual.series.map((x) => x.ejercicioId))];
  const hechas = actual.series.filter((x) => x.completada).length;

  return (
    <>
      <Encabezado titulo={contexto.dia?.nombre ?? 'Entrenamiento'} />
      <div className="fila-entre" style={{ marginTop: -12, marginBottom: 12 }}>
        <span className="texto-2">
          {duracion(Date.now() - actual.inicio)} · {hechas} de {actual.series.length} series
        </span>
        <button type="button" className="chip" onClick={() => setPocoTiempo(true)}>Poco tiempo</button>
      </div>
      <div className="pila">
        {contexto.semana && (
          <div role="note" className={`aviso ${contexto.semana.descarga ? 'aviso-dorado' : ''}`} style={{ fontSize: 14, padding: '10px 14px' }}>
            {contexto.semana.descarga ? 'Semana de descarga: más liviano a propósito, para recuperarte' : textoSemana(contexto.semana)}
          </div>
        )}
        {ids.map((id) => {
          const e = contexto.ejercicios[id];
          const nombre = e?.nombre ?? 'Ejercicio';
          const info = contexto.info[id];
          const series = actual.series.filter((x) => x.ejercicioId === id);
          const vezPasada = info && resumenSeries(info.ultima);
          return (
            <section key={id} className="tarjeta pila" aria-label={nombre}>
              <div className="fila">
                {e && <Miniatura e={e} tam={48} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Enlace a={'/mas/biblioteca/' + encodeURIComponent(id)}>
                    <strong>{nombre}</strong>
                  </Enlace>
                  {vezPasada && <div className="texto-2" style={{ fontSize: 13 }}>La vez pasada: {vezPasada}</div>}
                </div>
                {series.some((x) => !x.completada) && (
                  <button type="button" className="chip" onClick={() => setCambiando(id)}>Cambiar</button>
                )}
              </div>
              {info && (
                <span className={`chip ${info.sugerencia.motivo === 'subir' ? 'chip-dorado' : ''}`} style={{ alignSelf: 'flex-start', cursor: 'default' }}>
                  {e?.equipo === 'body only' && info.sugerencia.peso === null
                    ? 'Peso corporal: cargá peso solo si usás lastre'
                    : contexto.semana?.descarga && info.sugerencia.peso !== null
                      ? `Descarga: ${kg(info.sugerencia.peso)}`
                      : textoSugerencia(info.sugerencia)}
                </span>
              )}
              {series.map((x) => {
                const etiqueta = `serie ${x.numero} de ${nombre}`;
                return (
                  <div
                    key={x.numero}
                    className="fila"
                    style={{ justifyContent: 'space-between', gap: 6, opacity: x.completada ? 0.75 : 1 }}
                  >
                    <span className="texto-2 numeros" style={{ width: 18, fontWeight: 700 }}>{x.numero}</span>
                    <div>
                      <div className="texto-2" style={{ fontSize: 11, marginBottom: 2 }}>kg</div>
                      <Stepper
                        compacto
                        etiqueta={`Peso ${etiqueta}`}
                        valor={x.peso || null}
                        paso={contexto.incremento}
                        onCambio={(v) => despachar({ tipo: 'cambiar', ejercicioId: id, numero: x.numero, campo: 'peso', valor: v })}
                      />
                    </div>
                    <div>
                      <div className="texto-2" style={{ fontSize: 11, marginBottom: 2 }}>reps</div>
                      <Stepper
                        compacto
                        etiqueta={`Reps ${etiqueta}`}
                        valor={x.reps || null}
                        paso={1}
                        onCambio={(v) => despachar({ tipo: 'cambiar', ejercicioId: id, numero: x.numero, campo: 'reps', valor: v })}
                      />
                    </div>
                    <button
                      type="button"
                      className="boton-icono boton-completar"
                      style={{
                        alignSelf: 'flex-end',
                        background: x.completada ? 'var(--color-dorado)' : 'var(--color-tarjeta-alta)',
                        color: x.completada ? '#1A1306' : 'var(--color-texto-2)',
                      }}
                      aria-label={`${x.completada ? 'Desmarcar' : 'Completar'} ${etiqueta}`}
                      onClick={() => (x.completada ? despachar({ tipo: 'descompletar', ejercicioId: id, numero: x.numero }) : completar(id, x.numero))}
                    >
                      <IconoCheck />
                    </button>
                  </div>
                );
              })}
              <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => despachar({ tipo: 'agregar', ejercicioId: id })}>
                + Serie
              </button>
            </section>
          );
        })}

        {aviso && <div className="aviso" role="alert">{aviso}</div>}
        <Boton variante="dorado" ancho onClick={terminar}>Terminar entrenamiento</Boton>
        <div style={{ height: descansoHasta ? 90 : 0 }} />
      </div>
      {cambiando && (
        <PanelAlternativas
          nombre={contexto.ejercicios[cambiando]?.nombre ?? 'Ejercicio'}
          base={parametros(cambiando)}
          enSesion={new Set(ids)}
          onCerrar={() => setCambiando(null)}
          onElegir={({ ejercicio, info }) => {
            setCtx({ ...contexto, ejercicios: { ...contexto.ejercicios, [ejercicio.id]: ejercicio }, info: { ...contexto.info, [ejercicio.id]: info } });
            despachar({ tipo: 'reemplazar', ejercicioId: cambiando, nuevoId: ejercicio.id, peso: info.sugerencia.peso });
            setCambiando(null);
          }}
        />
      )}
      {pocoTiempo && (
        <PanelTiempo
          items={ids.map((id, i) => {
            const delEjercicio = actual.series.filter((x) => x.ejercicioId === id);
            const p = parametros(id);
            const original = actual.cambios?.find((c) => c.a === id)?.de ?? id;
            const posicion = contexto.dia?.ejercicios.findIndex((x) => x.ejercicioId === original) ?? i;
            return {
              ejercicioId: id,
              pendientes: delEjercicio.filter((x) => !x.completada).length,
              completadas: delEjercicio.filter((x) => x.completada).length,
              descansoSeg: p.descansoSeg,
              basico: p.basico ?? (posicion >= 0 ? posicion : i) < 2,
            };
          })}
          nombre={(id) => contexto.ejercicios[id]?.nombre ?? 'Ejercicio'}
          onCerrar={() => setPocoTiempo(false)}
          onAplicar={(r) => {
            despachar({ tipo: 'recortar', quitar: r.quitar, reducir: r.reducir, descansoMaxSeg: r.descansoMaxSeg });
            setPocoTiempo(false);
          }}
        />
      )}
      {descansoHasta && <Temporizador hasta={descansoHasta} onCambiar={setDescansoHasta} onCerrar={() => setDescansoHasta(null)} />}
    </>
  );
}
