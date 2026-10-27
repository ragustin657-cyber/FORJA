import type { Pose } from '../../core/cuerpo/fotos';

/** Silueta guía genérica para la primera foto de cada pose. */
export function Silueta({ pose }: { pose: Pose }) {
  const ancho = pose === 'perfil' ? 22 : 34;
  return (
    <svg className="foto-silueta" viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 3">
        <ellipse cx="50" cy="22" rx="11" ry="14" />
        <path d={`M${50 - ancho / 2} 44 Q50 38 ${50 + ancho / 2} 44 L${50 + ancho / 2 + 6} 100 L${50 + ancho / 2 - 2} 102 L${50 + ancho / 2 - 4} 120 L${50 + 8} 196 M${50 - ancho / 2} 44 L${50 - ancho / 2 - 6} 100 L${50 - ancho / 2 + 2} 102 L${50 - ancho / 2 + 4} 120 L${50 - 8} 196`} />
      </g>
    </svg>
  );
}
