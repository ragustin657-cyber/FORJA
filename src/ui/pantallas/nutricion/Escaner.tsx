import type { Origen } from '../../../core/nutricion/registro';
import type { Producto } from '../../../core/nutricion/tipos';

/** Código de barras: se completa en la siguiente tarea. */
export function Escaner(_props: { productos: Map<string, Producto>; onAgregar: (r: { origen: Origen; refId: string; nombre: string; cantidad: number }) => void }) {
  return <p className="texto-2" style={{ margin: 0 }}>Muy pronto.</p>;
}
