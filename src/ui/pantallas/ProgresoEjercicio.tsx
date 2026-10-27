import { kg, numero } from '../../core/formato';
import { textoNivel } from '../../core/nivel';
import { mesesParaGrafico, proyectadoEn, proyectar, type Proyeccion } from '../../core/proyeccion';
import { calcularRecords, puntosDeProgreso } from '../../core/records';
import { ajustesRepo } from '../../data/repos/ajustes';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { sesionesRepo } from '../../data/repos/sesiones';
import { Encabezado } from '../componentes/Encabezado';
import { GraficoLinea } from '../componentes/GraficoLinea';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';
import { Boton } from '../componentes/Boton';
import { cargarSugerencia } from '../nivel';
import { Enlace } from '../router';
import { MetaEjercicio } from './MetaEjercicio';

const MES = 30.44;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function textoFaltan(p: Extract<Proyeccion, { estado: 'faltan-datos' }>): string {
  const partes = [
    p.faltanSesiones ? plural(p.faltanSesiones, 'entrenamiento', 'entrenamientos') : '',
    p.faltanDias ? plural(p.faltanDias, 'día', 'días') : '',
  ].filter(Boolean);
  return `Necesitás al menos 4 entrenamientos en 3 semanas para proyectar. Te faltan ${partes.join(' y ')}.`;
}

function HastaDonde({ p, nivel, alCambiarNivel }: { p: Proyeccion; nivel: string; alCambiarNivel: () => void }) {
  const { datos: sugerencia, recargar } = useCarga(cargarSugerencia);
  return (
    <section aria-label="Hasta dónde podés llegar" className="tarjeta pila">
      <h2 style={{ fontSize: 16 }}>Hasta dónde podés llegar</h2>
      {p.estado === 'faltan-datos' && <p className="texto-2" style={{ margin: 0 }}>{textoFaltan(p)}</p>}
      {p.estado === 'estable' && (
        <p className="texto-2" style={{ margin: 0 }}>Tu fuerza viene estable, en {numero(p.hoy)} kg estimados. Cuando vuelvas a subir, la proyección se recalcula.</p>
      )}
      {p.estado === 'ok' && (
        <>
          <strong className="numeros" style={{ fontSize: 18 }}>{`Hoy: ${numero(p.hoy)} kg estimados`}</strong>
          <div className="pila" style={{ gap: 4 }}>
            {p.meses.map((m) => (
              <span key={m.m} className="numeros">{`En ${m.m} ${m.m === 1 ? 'mes' : 'meses'}: ${numero(m.valor)} kg (${numero(m.min)}–${numero(m.max)})`}</span>
            ))}
          </div>
          <div className="fila-entre texto-2" style={{ fontSize: 13 }}>
            <span>Ritmo de nivel {nivel}</span>
            <Enlace a="/mas/ajustes" className="chip">Cambiar</Enlace>
          </div>
        </>
      )}
      <p className="texto-2" style={{ fontSize: 12, margin: 0 }}>Es una estimación: depende de que entrenes, comas y descanses de forma constante.</p>
      {sugerencia && (
        <div className="aviso aviso-dorado pila" style={{ gap: 8 }}>
          <span>{textoNivel(sugerencia)}</span>
          <Boton
            variante="dorado"
            onClick={async () => {
              await ajustesRepo.guardar({ nivel: sugerencia.nivel });
              await recargar();
              alCambiarNivel();
            }}
          >
            Cambiar a {sugerencia.nivel}
          </Boton>
        </div>
      )}
    </section>
  );
}

const fecha = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

export function ProgresoEjercicio({ id }: { id: string }) {
  const { datos, recargar } = useCarga(async () => {
    const [ejercicio, historial, ajustes] = await Promise.all([ejerciciosRepo.porId(id), sesionesRepo.historialConFechas(id), ajustesRepo.obtener()]);
    return { ejercicio, historial, nivel: ajustes.nivel };
  }, [id]);
  if (!datos) return <Encabezado titulo="Progreso" atras />;

  const { ejercicio, historial } = datos;
  const puntos = puntosDeProgreso(historial);
  const ahora = Date.now();
  const proyeccion = proyectar(puntos, ahora, datos.nivel);
  const lineaProyeccion =
    proyeccion.estado === 'ok'
      ? mesesParaGrafico((puntos[puntos.length - 1].fecha - puntos[0].fecha) / 86_400_000).map((m) => ({ x: ahora + m * MES * 86_400_000, y: proyectadoEn(proyeccion, m * MES) }))
      : undefined;
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
              proyeccion={lineaProyeccion}
            />
          )}
        </Tarjeta>

        <HastaDonde p={proyeccion} nivel={datos.nivel} alCambiarNivel={recargar} />
        <MetaEjercicio ejercicioId={id} proyeccion={proyeccion} mejor={records.mejorE1rm} />

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
