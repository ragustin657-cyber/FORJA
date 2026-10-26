import { useEffect, useRef, useState } from 'react';
import { parsearNumero, sumarPaso } from '../../core/unidades';

type Props = {
  valor: number | null;
  paso: number;
  min?: number;
  etiqueta: string;
  onCambio: (v: number | null) => void;
  compacto?: boolean;
};

function mostrar(v: number | null): string {
  return v === null ? '' : String(v).replace('.', ',');
}

const leer = parsearNumero;

/** Control con − y + y un campo numérico que acepta coma decimal. */
export function Stepper({ valor, paso, min = 0, etiqueta, onCambio, compacto }: Props) {
  const [texto, setTexto] = useState(mostrar(valor));
  const escribiendo = useRef(false);
  // Mientras se escribe no se pisa el texto (si no, borrar y tipear agrega dígitos); al salir se muestra el valor guardado.
  useEffect(() => {
    if (!escribiendo.current && leer(texto) !== valor) setTexto(mostrar(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className={`stepper ${compacto ? 'stepper-compacto' : ''}`} role="group" aria-label={etiqueta}>
      <button type="button" className="boton-icono" aria-label={`Restar ${etiqueta}`} onClick={() => onCambio(sumarPaso(valor, paso, -1, min))}>
        −
      </button>
      <input
        inputMode="decimal"
        aria-label={etiqueta}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          onCambio(leer(e.target.value));
        }}
        onFocus={(e) => {
          escribiendo.current = true;
          e.target.select();
        }}
        onBlur={() => {
          escribiendo.current = false;
          setTexto(mostrar(valor));
        }}
      />
      <button type="button" className="boton-icono" aria-label={`Sumar ${etiqueta}`} onClick={() => onCambio(sumarPaso(valor, paso, 1, min))}>
        +
      </button>
    </div>
  );
}
