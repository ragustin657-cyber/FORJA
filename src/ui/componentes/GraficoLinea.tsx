import { useState } from 'react';

type Punto = { x: number; y: number; etiqueta: string; detalle: string };

/** Gráfico de línea simple en SVG: línea dorada, pocos ejes, toque para ver el detalle. */
export function GraficoLinea({ puntos, titulo, unidad }: { puntos: Punto[]; titulo: string; unidad: string }) {
  const [elegido, setElegido] = useState<number>(puntos.length - 1);
  const ancho = 340;
  const alto = 180;
  const margen = { izq: 48, der: 12, arr: 14, aba: 24 };
  const ys = puntos.map((p) => p.y);
  const minY = Math.floor(Math.min(...ys) * 0.95);
  const maxY = Math.ceil(Math.max(...ys) * 1.05);
  const xs = puntos.map((_, i) => margen.izq + (i * (ancho - margen.izq - margen.der)) / Math.max(1, puntos.length - 1));
  const y = (v: number) => margen.arr + ((maxY - v) * (alto - margen.arr - margen.aba)) / Math.max(1, maxY - minY);
  const camino = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${camino} L${xs[xs.length - 1].toFixed(1)},${alto - margen.aba} L${xs[0].toFixed(1)},${alto - margen.aba} Z`;
  const p = puntos[elegido];
  const marcas = [minY, Math.round((minY + maxY) / 2), maxY];

  return (
    <div>
      <div className="fila-entre" style={{ marginBottom: 6 }}>
        <span className="texto-2" style={{ fontSize: 13 }}>{p.etiqueta}</span>
        <strong className="numeros" style={{ color: 'var(--color-dorado)' }}>{p.detalle}</strong>
      </div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={titulo} style={{ width: '100%', height: 'auto', touchAction: 'pan-y' }}>
        <defs>
          <linearGradient id="relleno-dorado" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#C9A227" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
          </linearGradient>
        </defs>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={margen.izq} x2={ancho - margen.der} y1={y(m)} y2={y(m)} stroke="rgba(243,236,232,0.08)" />
            <text x={margen.izq - 6} y={y(m) + 4} textAnchor="end" fontSize="10" fill="#A69B97">{m} {unidad}</text>
          </g>
        ))}
        <path d={area} fill="url(#relleno-dorado)" />
        <path d={camino} fill="none" stroke="#C9A227" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((pt, i) => (
          <g key={i} onClick={() => setElegido(i)} style={{ cursor: 'pointer' }}>
            <circle cx={xs[i]} cy={y(pt.y)} r="14" fill="transparent" />
            <circle cx={xs[i]} cy={y(pt.y)} r={i === elegido ? 5 : 3} fill={i === elegido ? '#C9A227' : '#141012'} stroke="#C9A227" strokeWidth="2" />
          </g>
        ))}
      </svg>
    </div>
  );
}
