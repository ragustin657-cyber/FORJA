import { useState } from 'react';
import { textoNivel } from '../../core/nivel';
import { NIVELES, type Nivel } from '../../core/proyeccion';
import { ajustesRepo } from '../../data/repos/ajustes';
import { Boton } from '../componentes/Boton';
import { cargarSugerencia } from '../nivel';
import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';

const INCREMENTOS = [1, 1.25, 2, 2.5];

export function Ajustes() {
  const { datos, recargar } = useCarga(() => ajustesRepo.obtener());
  const { datos: sugerencia, recargar: recargarSugerencia } = useCarga(cargarSugerencia);
  const [guardado, setGuardado] = useState(false);

  async function elegirNivel(nivel: Nivel) {
    await ajustesRepo.guardar({ nivel });
    setGuardado(true);
    await Promise.all([recargar(), recargarSugerencia()]);
  }

  return (
    <>
      <Encabezado titulo="Ajustes" atras />
      {datos && (
        <div className="pila">
        <Tarjeta className="pila">
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Incremento de peso</h2>
            <p className="texto-2" style={{ fontSize: 14, margin: 0 }}>
              Cuánto suma el botón + y a qué múltiplo se redondean las sugerencias. Usá el disco más chico que tengas en tu gimnasio.
            </p>
          </div>
          <div role="radiogroup" aria-label="Incremento de peso" className="chips" style={{ flexWrap: 'wrap' }}>
            {INCREMENTOS.map((n) => (
              <label key={n} className="chip" aria-pressed={datos.incrementoKg === n} style={{ minHeight: 44 }}>
                <input
                  type="radio"
                  name="incremento"
                  value={n}
                  checked={datos.incrementoKg === n}
                  onChange={async () => {
                    await ajustesRepo.guardar({ incrementoKg: n });
                    setGuardado(true);
                    recargar();
                  }}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  aria-label={`${String(n).replace('.', ',')} kg`}
                />
                {String(n).replace('.', ',')} kg
              </label>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="pila">
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Nivel de entrenamiento</h2>
            <p className="texto-2" style={{ fontSize: 14, margin: 0 }}>
              Define qué tan rápido puede subir tu fuerza en la proyección. Cuanto más entrenado, más lento se progresa.
            </p>
          </div>
          <div role="radiogroup" aria-label="Nivel de entrenamiento" className="pila" style={{ gap: 8 }}>
            {NIVELES.map((n) => (
              <label key={n.id} className="opcion" aria-pressed={datos.nivel === n.id}>
                <input
                  type="radio"
                  name="nivel"
                  checked={datos.nivel === n.id}
                  onChange={() => elegirNivel(n.id)}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  aria-label={`${n.nombre}: ${n.detalle}`}
                />
                <strong>{n.nombre}</strong>
                <span className="texto-2" style={{ fontSize: 13 }}>{n.detalle}</span>
              </label>
            ))}
          </div>
          {sugerencia && (
            <section aria-label="Nivel sugerido" className="aviso aviso-dorado pila" style={{ gap: 8 }}>
              <span>{textoNivel(sugerencia)}</span>
              <Boton variante="dorado" onClick={() => elegirNivel(sugerencia.nivel)}>Cambiar a {sugerencia.nivel}</Boton>
            </section>
          )}
        </Tarjeta>
        {guardado && <p className="texto-2" role="status" style={{ margin: 0, fontSize: 14 }}>Guardado</p>}
        </div>
      )}
    </>
  );
}
