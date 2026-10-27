import type { Macros } from '../../../core/nutricion/tipos';
import { miles } from '../../nutricion';

function Barra({ valor, meta, etiqueta }: { valor: number; meta: number; etiqueta: string }) {
  const pct = meta > 0 ? Math.min(100, (valor / meta) * 100) : 0;
  return (
    <div className="barra-meta" role="progressbar" aria-label={etiqueta} aria-valuenow={Math.round(valor)} aria-valuemax={Math.round(meta)}>
      <span style={{ width: `${pct}%`, background: valor > meta ? 'var(--color-bordo-claro)' : undefined }} />
    </div>
  );
}

/** "1.840 de 2.210 kcal · 120 de 160 g proteína", con barras. */
export function BarrasDia({ total, kcal, proteina }: { total: Macros; kcal: number; proteina: number }) {
  return (
    <div className="pila" style={{ gap: 6 }} data-testid="total-registrado">
      <span className="numeros" style={{ fontSize: 15 }}>
        <strong style={{ color: 'var(--color-dorado)' }}>{miles(total.kcal)}</strong> de {miles(kcal)} kcal · {miles(total.proteina)} de {miles(proteina)} g proteína
      </span>
      <Barra valor={total.kcal} meta={kcal} etiqueta="Calorías del día" />
      <Barra valor={total.proteina} meta={proteina} etiqueta="Proteína del día" />
    </div>
  );
}
