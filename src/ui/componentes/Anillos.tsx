import { miles } from '../nutricion';

function Anillo({ valor, meta, color, etiqueta }: { valor: number; meta: number; color: string; etiqueta: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = meta > 0 ? Math.min(1, valor / meta) : 0;
  return (
    <svg viewBox="0 0 76 76" width="76" height="76" aria-hidden data-etiqueta={etiqueta}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-tarjeta-alta)" strokeWidth="8" />
      {pct > 0 && <circle
        cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${(c * pct).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dasharray 0.4s' }}
      />}
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--color-texto)">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

/** Dos anillos: calorías y proteína del día contra la meta. Si se pasa de calorías, el anillo se marca en bordó claro. */
export function Anillos({ kcal, metaKcal, proteina, metaProteina }: { kcal: number; metaKcal: number; proteina: number; metaProteina: number }) {
  const pasado = kcal > metaKcal;
  return (
    <div className="fila" style={{ justifyContent: 'space-around', gap: 12 }}>
      <div className="pila" style={{ alignItems: 'center', gap: 4 }}>
        <Anillo valor={kcal} meta={metaKcal} etiqueta="calorías" color={pasado ? 'var(--color-bordo-claro)' : 'var(--color-dorado)'} />
        <span className="numeros" style={{ fontSize: 13 }}>{miles(kcal)} de {miles(metaKcal)} kcal</span>
      </div>
      <div className="pila" style={{ alignItems: 'center', gap: 4 }}>
        <Anillo valor={proteina} meta={metaProteina} etiqueta="proteína" color="var(--color-dorado)" />
        <span className="numeros" style={{ fontSize: 13 }}>{miles(proteina)} de {miles(metaProteina)} g proteína</span>
      </div>
    </div>
  );
}
