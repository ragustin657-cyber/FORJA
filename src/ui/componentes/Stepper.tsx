import { useEffect, useState } from 'react';
import { parsearNumero, sumarPaso } from '../../core/unidades';

type Props = {
  valor: number | null;
  paso: number;
  min?: number;
  etiqueta: string;
  onCambio: (v: number | null) => void;
};

function mostrar(v: number | null): string {
  return v === null ? '' : String(v).replace('.', ',');
}

const leer = parsearNumero;

/** Control con − y + y un campo numérico que acepta coma decimal. */
export function Stepper({ valor, paso, min = 0, etiqueta, onCambio }: Props) {
  const [texto, setTexto] = useState(mostrar(valor));
  useEffect(() => {
    if (leer(texto) !== valor) setTexto(mostrar(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className="stepper" role="group" aria-label={etiqueta}>
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
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="boton-icono" aria-label={`Sumar ${etiqueta}`} onClick={() => onCambio(sumarPaso(valor, paso, 1, min))}>
        +
      </button>
    </div>
  );
}
