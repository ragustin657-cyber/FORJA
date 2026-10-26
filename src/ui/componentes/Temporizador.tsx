import { useEffect, useRef, useState } from 'react';
import { pitido } from '../sonido';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Cuenta regresiva de descanso. `hasta` es el momento en que termina (ms). */
export function Temporizador({ hasta, onCambiar, onCerrar }: { hasta: number; onCambiar: (hasta: number) => void; onCerrar: () => void }) {
  const [ahora, setAhora] = useState(Date.now());
  const sono = useRef(false);
  const restante = Math.max(0, Math.ceil((hasta - ahora) / 1000));

  useEffect(() => {
    sono.current = false;
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, [hasta]);

  useEffect(() => {
    if (restante === 0 && !sono.current) {
      sono.current = true;
      pitido();
    }
  }, [restante]);

  return (
    <div
      role="timer"
      aria-label="Descanso"
      className="fila-entre"
      style={{
        position: 'fixed', left: 12, right: 12, zIndex: 9,
        bottom: 'calc(var(--barra-alto) + env(safe-area-inset-bottom) + 12px)',
        maxWidth: 536, margin: '0 auto',
        background: restante === 0 ? 'var(--color-dorado)' : 'var(--color-bordo)',
        color: restante === 0 ? '#1A1306' : 'var(--color-texto)',
        borderRadius: 16, padding: '10px 12px 10px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      }}
    >
      <span>
        <span style={{ fontSize: 13, opacity: 0.85, display: 'block' }}>{restante === 0 ? '¡A la próxima serie!' : 'Descanso'}</span>
        <strong className="numeros" style={{ fontSize: 28 }}>{mmss(restante)}</strong>
      </span>
      <span className="fila" style={{ gap: 8 }}>
        {restante > 0 && (
          <button type="button" className="chip" style={{ background: 'rgba(0,0,0,0.25)', color: 'inherit' }} onClick={() => onCambiar(hasta + 15_000)}>
            +15 s
          </button>
        )}
        <button type="button" className="chip" style={{ background: 'rgba(0,0,0,0.25)', color: 'inherit' }} onClick={onCerrar}>
          {restante === 0 ? 'Cerrar' : 'Saltar'}
        </button>
      </span>
    </div>
  );
}
