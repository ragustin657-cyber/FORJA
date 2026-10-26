import type { ReactNode } from 'react';

type Props = {
  variante?: 'primario' | 'secundario' | 'dorado' | 'peligro';
  ancho?: boolean;
  children: ReactNode;
  [k: string]: unknown;
};

export function Boton({ variante = 'primario', ancho, children, className, ...resto }: Props) {
  const clases = ['boton', `boton-${variante}`, ancho ? 'boton-ancho' : '', (className as string) ?? ''].join(' ').trim();
  return (
    <button type="button" className={clases} {...resto}>
      {children}
    </button>
  );
}
