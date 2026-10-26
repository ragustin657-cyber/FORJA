import { rutinasRepo } from '../../data/repos/rutinas';
import { sesionesRepo } from '../../data/repos/sesiones';
import { empezarDia } from '../acciones';
import { Boton } from '../componentes/Boton';
import { Encabezado } from '../componentes/Encabezado';
import { useCarga } from '../datos';
import { Enlace, navegar } from '../router';

export function Entrenar() {
  const { datos } = useCarga(async () => ({ rutinas: await rutinasRepo.activas(), enCurso: await sesionesRepo.enCurso() }));
  if (!datos) return <Encabezado titulo="Entrenar" />;
  const { rutinas, enCurso } = datos;

  return (
    <>
      <Encabezado titulo="Entrenar" />
      <div className="pila">
        {enCurso && (
          <div className="aviso aviso-dorado fila-entre">
            <span>Tenés un entrenamiento en curso</span>
            <Boton variante="dorado" onClick={() => navegar('/entrenar/sesion')}>Retomar</Boton>
          </div>
        )}

        {rutinas.length === 0 && (
          <div className="tarjeta vacio">
            <p style={{ marginTop: 0 }}>Todavía no tenés rutinas.</p>
            <p className="texto-2" style={{ marginBottom: 0 }}>Armá la tuya con los ejercicios que hacés en el gimnasio.</p>
          </div>
        )}

        {rutinas.map((r) => (
          <article key={r.id} className="tarjeta pila" aria-label={r.nombre}>
            <div className="fila-entre">
              <h2 style={{ fontSize: 20 }}>{r.nombre}</h2>
              <Enlace a={'/entrenar/rutina/' + r.id} className="chip">Editar</Enlace>
            </div>
            {r.dias.map((d) => (
              <div key={d.id} className="fila-entre" style={{ borderTop: '1px solid var(--color-linea)', paddingTop: 12 }}>
                <span>
                  <strong>{d.nombre}</strong>
                  <br />
                  <span className="texto-2" style={{ fontSize: 14 }}>
                    {d.ejercicios.length} {d.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>
                </span>
                <Boton
                  aria-label={`Empezar ${d.nombre}`}
                  disabled={d.ejercicios.length === 0}
                  onClick={async () => {
                    await empezarDia(r, d);
                    navegar('/entrenar/sesion');
                  }}
                >
                  Empezar
                </Boton>
              </div>
            ))}
          </article>
        ))}

        <Boton variante="secundario" ancho onClick={() => navegar('/entrenar/rutina/nueva')}>Nueva rutina</Boton>
      </div>
    </>
  );
}
