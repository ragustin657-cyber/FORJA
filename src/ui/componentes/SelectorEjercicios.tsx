import { useMemo, useState } from 'react';
import { EQUIPOS, filtrarEjercicios, MUSCULOS } from '../../core/biblioteca';
import type { Ejercicio } from '../../data/tipos';
import { urlImagen } from '../datos';
import { IconoEstrella } from './Iconos';

const MUSCULOS_FILTRO = ['chest', 'shoulders', 'triceps', 'biceps', 'lats', 'middle back', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'abdominals'];
const EQUIPOS_FILTRO = ['barbell', 'dumbbell', 'cable', 'machine', 'body only', 'e-z curl bar', 'kettlebells'];
const LIMITE = 60;

type Props = {
  ejercicios: Ejercicio[];
  /** Qué pasa al tocar un ejercicio. */
  onElegir: (e: Ejercicio) => void;
  /** Texto accesible de la acción de cada fila. */
  accion?: (e: Ejercicio) => string;
};

export function Miniatura({ e, tam = 56 }: { e: Ejercicio; tam?: number }) {
  return e.imagenes[0] ? (
    <img
      src={urlImagen(e.imagenes[0])}
      alt=""
      loading="lazy"
      width={tam}
      height={tam}
      style={{ width: tam, height: tam, objectFit: 'cover', borderRadius: 10, background: '#fff', flexShrink: 0 }}
    />
  ) : (
    <div style={{ width: tam, height: tam, borderRadius: 10, background: 'var(--color-tarjeta-alta)', flexShrink: 0 }} />
  );
}

export function SelectorEjercicios({ ejercicios, onElegir, accion }: Props) {
  const [texto, setTexto] = useState('');
  const [musculo, setMusculo] = useState<string>();
  const [equipo, setEquipo] = useState<string>();
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [todos, setTodos] = useState(false);

  const resultado = useMemo(
    () => filtrarEjercicios(ejercicios, { texto, musculo, equipo, soloFavoritos }),
    [ejercicios, texto, musculo, equipo, soloFavoritos],
  );
  const visibles = todos ? resultado : resultado.slice(0, LIMITE);

  return (
    <div className="pila">
      <input
        type="search"
        className="entrada"
        aria-label="Buscar ejercicio"
        placeholder="Buscar: press, sentadilla, remo…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setTodos(false);
        }}
      />
      <div className="chips" aria-label="Filtrar por músculo">
        <button type="button" className="chip" aria-pressed={soloFavoritos} onClick={() => setSoloFavoritos(!soloFavoritos)}>
          ★ Favoritos
        </button>
        {MUSCULOS_FILTRO.map((m) => (
          <button key={m} type="button" className="chip" aria-pressed={musculo === m} onClick={() => setMusculo(musculo === m ? undefined : m)}>
            {MUSCULOS[m]}
          </button>
        ))}
      </div>
      <div className="chips" aria-label="Filtrar por equipo">
        {EQUIPOS_FILTRO.map((q) => (
          <button key={q} type="button" className="chip" aria-pressed={equipo === q} onClick={() => setEquipo(equipo === q ? undefined : q)}>
            {EQUIPOS[q]}
          </button>
        ))}
      </div>

      {resultado.length === 0 ? (
        <p className="vacio">No encontramos ejercicios con esa búsqueda.</p>
      ) : (
        <ul aria-label="Ejercicios" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibles.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="tarjeta fila"
                style={{ width: '100%', textAlign: 'left', padding: 10, cursor: 'pointer' }}
                aria-label={accion?.(e)}
                onClick={() => onElegir(e)}
              >
                <Miniatura e={e} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block' }}>{e.nombre}</strong>
                  <span className="texto-2" style={{ fontSize: 13 }}>
                    {e.musculos.slice(0, 2).map((m) => MUSCULOS[m] ?? m).join(' · ')} · {EQUIPOS[e.equipo] ?? e.equipo}
                  </span>
                </span>
                {e.favorito && (
                  <span style={{ color: 'var(--color-dorado)', width: 20 }} aria-label="Favorito">
                    <IconoEstrella llena />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!todos && resultado.length > LIMITE && (
        <button type="button" className="boton boton-secundario" onClick={() => setTodos(true)}>
          Ver los {resultado.length} resultados
        </button>
      )}
    </div>
  );
}
