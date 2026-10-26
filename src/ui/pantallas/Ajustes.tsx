import { useState } from 'react';
import { ajustesRepo } from '../../data/repos/ajustes';
import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';

const INCREMENTOS = [1, 1.25, 2, 2.5];

export function Ajustes() {
  const { datos, recargar } = useCarga(() => ajustesRepo.obtener());
  const [guardado, setGuardado] = useState(false);

  return (
    <>
      <Encabezado titulo="Ajustes" atras />
      {datos && (
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
          {guardado && <p className="texto-2" role="status" style={{ margin: 0, fontSize: 14 }}>Guardado</p>}
        </Tarjeta>
      )}
    </>
  );
}
