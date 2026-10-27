import { DIAS, diaDeHoy, type EstadoNutricion } from '../../nutricion';
import { ComidaFila } from './ComidaFila';

export function MenuDeHoy({ estado }: { estado: EstadoNutricion }) {
  const dia = diaDeHoy();
  return (
    <section className="tarjeta pila" aria-label="Menú de hoy" style={{ gap: 10 }}>
      <span className="subtitulo" style={{ margin: 0 }}>Menú de hoy · {DIAS[dia]}</span>
      {estado.menu.dias[dia].comidas.map((c, i) => (
        <ComidaFila key={i} comida={c} dia={dia} indice={i} />
      ))}
    </section>
  );
}
