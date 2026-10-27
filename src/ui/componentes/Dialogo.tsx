import type { ReactNode } from 'react';
import { Boton } from './Boton';

/** Confirmación propia (no el confirm() del navegador), con un botón principal y Cancelar. */
export function Dialogo({ titulo, children, confirmar, peligro, onConfirmar, onCancelar }: {
  titulo: string;
  children?: ReactNode;
  confirmar: string;
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="dialogo-fondo" onClick={onCancelar}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className="dialogo pila" onClick={(e) => e.stopPropagation()}>
        <strong style={{ fontSize: 18 }}>{titulo}</strong>
        {children && <div className="texto-2">{children}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
          <Boton variante={peligro ? 'peligro' : 'primario'} onClick={onConfirmar}>{confirmar}</Boton>
        </div>
      </div>
    </div>
  );
}
