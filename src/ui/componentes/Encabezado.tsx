import type { ReactNode } from 'react';
import { volver } from '../router';
import { IconoAtras } from './Iconos';

/** Encabezado de pantalla: título, botón de volver opcional y acción a la derecha. */
export function Encabezado({ titulo, atras, accion }: { titulo: string; atras?: boolean; accion?: ReactNode }) {
  return (
    <header className="encabezado">
      <div className="fila" style={{ minWidth: 0 }}>
        {atras && (
          <button type="button" className="boton-icono" aria-label="Volver" onClick={volver}>
            <IconoAtras />
          </button>
        )}
        <h1 className="titulo" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</h1>
      </div>
      {accion}
    </header>
  );
}
