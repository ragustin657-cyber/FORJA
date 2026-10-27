import { useState } from 'react';
import { grasaActual, serieDeGrasa } from '../../../core/cuerpo/grasa';
import { MEDIDAS, serieDeMedida, ultimasMedidas, type NombreMedida, type RegistroMedidas } from '../../../core/cuerpo/medidas';
import { numero } from '../../../core/formato';
import { cuerpoRepo } from '../../../data/repos/cuerpo';
import { nutricionRepo } from '../../../data/repos/nutricion';
import { Dialogo } from '../../componentes/Dialogo';
import { GraficoLinea } from '../../componentes/GraficoLinea';
import { IconoBasura } from '../../componentes/Iconos';
import { useCarga } from '../../datos';
import { Enlace } from '../../router';

type Serie = NombreMedida | 'grasa';

const diferencia = (d: number | null) => (d === null ? '' : ` · ${d > 0 ? '+' : d < 0 ? '−' : '±'}${numero(Math.abs(d))}`);
const fechaCorta = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

function resumen(r: RegistroMedidas): string {
  return MEDIDAS.filter((m) => r[m.id] !== undefined).map((m) => `${m.nombre.toLowerCase()} ${numero(r[m.id]!)}`).join(' · ');
}

export function Medidas() {
  const { datos, recargar } = useCarga(async () => ({ registros: await cuerpoRepo.medidas(), perfil: await nutricionRepo.perfil() }));
  const [elegida, setElegida] = useState<Serie | null>(null);
  const [borrar, setBorrar] = useState<RegistroMedidas | null>(null);
  if (!datos) return null;
  const { registros, perfil } = datos;

  if (registros.length === 0) {
    return (
      <section aria-label="Medidas" className="tarjeta pila">
        <span className="subtitulo" style={{ margin: 0 }}>Medidas</span>
        <p className="texto-2" style={{ margin: 0 }}>Anotá tus medidas cada 2 semanas para ver cómo cambia tu cuerpo, más allá de la balanza.</p>
        <Enlace a="/progreso/medidas" className="boton boton-secundario boton-ancho">Cargar medidas</Enlace>
      </section>
    );
  }

  const ultimas = ultimasMedidas(registros);
  const grasa = perfil ? grasaActual(perfil.sexo, perfil.alturaCm, registros) : null;
  const serieGrasa = perfil ? serieDeGrasa(perfil.sexo, perfil.alturaCm, registros) : [];
  const opciones: { id: Serie; nombre: string }[] = [
    ...MEDIDAS.filter((m) => ultimas[m.id]),
    ...(serieGrasa.length ? [{ id: 'grasa' as const, nombre: '% grasa' }] : []),
  ];
  const actual = opciones.find((o) => o.id === elegida) ?? opciones[0];
  const puntos = actual.id === 'grasa' ? serieGrasa : serieDeMedida(registros, actual.id);
  const unidad = actual.id === 'grasa' ? '%' : 'cm';

  return (
    <section aria-label="Medidas" className="tarjeta pila">
      <div className="fila-entre">
        <span className="subtitulo" style={{ margin: 0 }}>Medidas</span>
        <Enlace a="/progreso/medidas" className="chip">Cargar medidas</Enlace>
      </div>
      <div className="pila" style={{ gap: 4 }}>
        {MEDIDAS.filter((m) => ultimas[m.id]).map((m) => (
          <span key={m.id} className="numeros">{`${m.nombre} ${numero(ultimas[m.id]!.valor)} cm${diferencia(ultimas[m.id]!.diferencia)}`}</span>
        ))}
      </div>
      <div className="pila" style={{ gap: 2 }}>
        {grasa !== null ? (
          <>
            <span>
              % de grasa estimado: <strong style={{ color: 'var(--color-dorado)' }}>{numero(grasa)} %</strong>
            </span>
            <span className="texto-2" style={{ fontSize: 12 }}>Estimación: puede variar ±3–4 % respecto de una medición profesional.</span>
          </>
        ) : (
          <span className="texto-2" style={{ fontSize: 14 }}>
            {perfil
              ? `Sumá cintura y cuello${perfil.sexo === 'mujer' ? ' y cadera' : ''} para estimar tu % de grasa.`
              : 'Armá tu plan para estimar tu % de grasa.'}
          </span>
        )}
      </div>
      <div className="chips" role="group" aria-label="Gráfico">
        {opciones.map((o) => (
          <button key={o.id} type="button" className="chip" aria-pressed={o.id === actual.id} onClick={() => setElegida(o.id)}>
            {o.nombre}
          </button>
        ))}
      </div>
      {puntos.length >= 2 ? (
        <GraficoLinea
          titulo={actual.nombre === '% grasa' ? '% de grasa' : actual.nombre}
          unidad={unidad}
          puntos={puntos.map((p) => ({ x: p.fecha, y: p.valor, etiqueta: fechaCorta(p.fecha), detalle: `${numero(p.valor)} ${unidad}` }))}
        />
      ) : (
        <p className="texto-2" style={{ margin: 0, fontSize: 14 }}>Cargá al menos dos registros para ver el gráfico.</p>
      )}
      <div className="pila" style={{ gap: 6 }}>
        <span className="texto-2" style={{ fontSize: 13 }}>Últimos registros</span>
        <ul className="pila" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }}>
          {[...registros].reverse().slice(0, 5).map((r) => (
            <li key={r.id} className="fila-entre" style={{ fontSize: 14 }}>
              <span>
                <strong>{fechaCorta(r.fecha)}</strong> <span className="texto-2">{resumen(r)}</span>
              </span>
              <button type="button" className="boton-icono" aria-label={`Borrar las medidas del ${fechaCorta(r.fecha)}`} onClick={() => setBorrar(r)}>
                <IconoBasura />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {borrar && (
        <Dialogo
          titulo="¿Borrar estas medidas?"
          confirmar="Borrar"
          peligro
          onCancelar={() => setBorrar(null)}
          onConfirmar={async () => {
            await cuerpoRepo.borrarMedidas(borrar.id);
            setBorrar(null);
            recargar();
          }}
        >
          Se borran las medidas del {fechaCorta(borrar.fecha)}.
        </Dialogo>
      )}
    </section>
  );
}
