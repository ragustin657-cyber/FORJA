import type { ReactNode } from 'react';

export function Tarjeta({ children, className = '', ...resto }: { children: ReactNode; className?: string; [k: string]: unknown }) {
  return (
    <div className={`tarjeta ${className}`.trim()} {...resto}>
      {children}
    </div>
  );
}
