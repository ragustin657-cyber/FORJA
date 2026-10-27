import { useState } from 'react';
import { planesRepo } from '../../data/repos/planes';
import { diaMes, type PlanCargado } from '../plan';
import { Enlace } from '../router';
import { Boton } from './Boton';
import { Dialogo } from './Dialogo';

/** Tarjeta del plan en Entrenar: tira de 12 semanas, entrenamientos de esta semana y acciones. */
export function TarjetaPlan({ datos, alCambiar }: { datos: PlanCargado; alCambiar: () => void }) {
  const [terminar, setTerminar] = useState(false);
  const { plan, rutina, semana, estaSemana } = datos;
  return (
    <section aria-label="Tu plan" className="tarjeta pila" style={{ borderColor: 'rgba(201,162,39,0.45)' }}>
      <span className="subtitulo" style={{ margin: 0 }}>Tu plan</span>
      <strong style={{ fontSize: 18 }}>{rutina.nombre}</strong>
      {semana.estado === 'por-empezar' && <span className="texto-2">{`Tu plan arranca el lunes ${diaMes(plan.inicio)}`}</span>}
      {semana.estado === 'terminado' && <span className="texto-2">Completaste las 12 semanas.</span>}
      <ol role="list" className="plan-semanas">
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const descarga = n % 4 === 0;
          const actual = semana.estado === 'activo' && semana.semana === n;
          const pasada = semana.estado === 'terminado' || (semana.estado === 'activo' && n < semana.semana);
          return (
            <li
              key={n}
              aria-label={`Semana ${n}${descarga ? ', descarga' : ''}${actual ? ', actual' : ''}`}
              className={`plan-semana${actual ? ' actual' : ''}${pasada ? ' pasada' : ''}${descarga ? ' descarga' : ''}`}
            >
              {descarga ? 'D' : n}
            </li>
          );
        })}
      </ol>
      {semana.estado === 'activo' && <span className="numeros">{`Esta semana: ${estaSemana} de ${plan.dias} entrenamientos`}</span>}
      <div className="fila" style={{ gap: 8 }}>
        <Enlace a={'/entrenar/rutina/' + rutina.id} className="boton boton-secundario">Editar rutina</Enlace>
        <Boton variante="peligro" onClick={() => setTerminar(true)}>Terminar plan</Boton>
      </div>
      {terminar && (
        <Dialogo
          titulo="¿Terminar el plan?"
          confirmar="Terminar"
          peligro
          onCancelar={() => setTerminar(false)}
          onConfirmar={async () => {
            await planesRepo.cambiarEstado(plan.id, 'cortado');
            setTerminar(false);
            alCambiar();
          }}
        >
          La rutina del plan queda guardada para que la sigas usando si querés.
        </Dialogo>
      )}
    </section>
  );
}
