import { totalesDia, type DiaMenu } from '../../../core/nutricion/menu';
import { ALIMENTOS, PLATOS, miles } from '../../nutricion';

const TOLERANCIA = 0.05;

/** "Total del día: 2.215 de 2.210 kcal", con un aviso si se aleja más de 5 % de la meta. */
export function TotalDia({ dia, meta }: { dia: DiaMenu; meta: number }) {
  const total = totalesDia(dia, PLATOS, ALIMENTOS);
  const diferencia = (total.kcal - meta) / meta;
  return (
    <div data-testid="total-dia">
      <span className="texto-2 numeros" style={{ fontSize: 14 }}>
        Total del día: {miles(total.kcal)} de {miles(meta)} kcal
      </span>
      {Math.abs(diferencia) > TOLERANCIA && (
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-dorado)' }}>
          Este día queda {Math.round(Math.abs(diferencia) * 100)} % {diferencia < 0 ? 'menos de tu meta' : 'más de tu meta'}: no encontramos porciones que lleguen justo.
        </p>
      )}
    </div>
  );
}
