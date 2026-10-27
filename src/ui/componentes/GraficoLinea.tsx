import { useState } from 'react';

type Punto = { x: number; y: number; etiqueta: string; detalle: string };

/** Gráfico de línea simple en SVG: línea dorada, pocos ejes, toque para ver el detalle. */
/**
 * `tendencia` (opcional): una segunda línea punteada, un valor por punto.
 * `proyeccion` (opcional): línea punteada hacia el futuro; con ella los puntos se ubican por fecha (x).
 */
export function GraficoLinea({ puntos, titulo, unidad, tendencia, proyeccion }: {
  puntos: Punto[]; titulo: string; unidad: string; tendencia?: number[]; proyeccion?: { x: number; y: number }[];
}) {
  const [elegido, setElegido] = useState<number>(puntos.length - 1);
  const ancho = 340;
  const alto = 180;
  const margen = { izq: 48, der: 12, arr: 14, aba: 24 };
  const ys = [...puntos.map((p) => p.y), ...(tendencia ?? []), ...(proyeccion ?? []).map((p) => p.y)];
  const minY = Math.floor(Math.min(...ys) * 0.95);
  const maxY = Math.ceil(Math.max(...ys) * 1.05);
  const anchoUtil = ancho - margen.izq - margen.der;
  const x0 = puntos[0].x;
  const x1 = proyeccion?.length ? proyeccion[proyeccion.length - 1].x : x0;
  const porFecha = (v: number) => margen.izq + ((v - x0) * anchoUtil) / Math.max(1, x1 - x0);
  const xs = proyeccion?.length ? puntos.map((p) => porFecha(p.x)) : puntos.map((_, i) => margen.izq + (i * anchoUtil) / Math.max(1, puntos.length - 1));
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
        {tendencia && (
          <path
            d={tendencia.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
            fill="none" stroke="#A69B97" strokeWidth="1.5" strokeDasharray="4 4"
          />
        )}
        {proyeccion && proyeccion.length > 1 && (
          <path
            aria-label="Proyección"
            d={proyeccion.map((q, i) => `${i === 0 ? 'M' : 'L'}${porFecha(q.x).toFixed(1)},${y(q.y).toFixed(1)}`).join(' ')}
            fill="none" stroke="#C9A227" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="5 5"
          />
        )}
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
