import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';

/** Pantallas que se completan en fases siguientes. */
export function Nutricion() {
  return (
    <>
      <Encabezado titulo="Nutrición" />
      <Tarjeta>
        <p className="texto-2" style={{ margin: 0 }}>
          Acá vas a tener tu menú semanal, el registro de comidas y la lista de compras. Llega en la próxima fase.
        </p>
      </Tarjeta>
    </>
  );
}
