import { macrosDePlato } from '../../../core/nutricion/platos';
import type { ComidaMenu } from '../../../core/nutricion/menu';
import { TIPOS_COMIDA } from '../../../core/nutricion/tipos';
import { ALIMENTOS, PLATOS, miles } from '../../nutricion';
import { Enlace } from '../../router';

/** Una comida del menú: tipo, plato (con enlace al detalle), calorías y proteína. */
export function ComidaFila({ comida, dia, indice, onCambiar }: { comida: ComidaMenu; dia: number; indice: number; onCambiar?: () => void }) {
  const plato = comida.platoId ? PLATOS.get(comida.platoId) : undefined;
  const m = plato ? macrosDePlato(plato, ALIMENTOS, comida.factor) : null;
  return (
    <article aria-label={TIPOS_COMIDA[comida.tipo]} className="fila" style={{ borderTop: '1px solid var(--color-linea)', paddingTop: 10, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="texto-2" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{TIPOS_COMIDA[comida.tipo]}</div>
        {plato && m ? (
          <>
            <Enlace a={`/nutricion/plato/${dia}/${indice}`}>
              <strong>{plato.nombre}</strong>
            </Enlace>
            <div className="texto-2 numeros" style={{ fontSize: 13 }}>
              {miles(m.kcal)} kcal · {miles(m.proteina)} g proteína
            </div>
          </>
        ) : (
          <p className="texto-2" style={{ margin: '2px 0 0', fontSize: 14 }}>
            No encontramos platos para {TIPOS_COMIDA[comida.tipo].toLowerCase()} con lo que no comés.
          </p>
        )}
      </div>
      {onCambiar && plato && (
        <button type="button" className="chip" onClick={onCambiar}>
          Cambiar
        </button>
      )}
    </article>
  );
}
