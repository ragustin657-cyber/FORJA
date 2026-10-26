// Íconos de línea simples, dibujados a mano para no depender de librerías.
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IconoInicio = () => (
  <svg {...base}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></svg>
);
export const IconoEntrenar = () => (
  <svg {...base}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></svg>
);
export const IconoNutricion = () => (
  <svg {...base}><path d="M12 7c-1.5-2.5-6-2.5-7 1.5-.8 3.5 2 9.5 4.5 10.5 1 .4 1.7-.3 2.5-.3s1.5.7 2.5.3C17 18 19.8 12 19 8.5c-1-4-5.5-4-7-1.5Z" /><path d="M12 7c0-2 1-3.5 2.5-4" /></svg>
);
export const IconoProgreso = () => (
  <svg {...base}><path d="M4 19.5h16" /><path d="m5 15 4.5-4.5 3.5 3L19 7" /><path d="M15 7h4v4" /></svg>
);
export const IconoMas = () => (
  <svg {...base}><circle cx="5.5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18.5" cy="12" r="1.3" /></svg>
);
export const IconoAtras = () => (
  <svg {...base}><path d="m14.5 5-7 7 7 7" /></svg>
);
export const IconoEstrella = ({ llena }: { llena?: boolean }) => (
  <svg {...base} fill={llena ? 'currentColor' : 'none'}><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" /></svg>
);
export const IconoCheck = () => (
  <svg {...base} strokeWidth={3}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconoMas2 = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconoBasura = () => (
  <svg {...base}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" /></svg>
);
export const IconoArriba = () => (
  <svg {...base}><path d="m6 14.5 6-6 6 6" /></svg>
);
export const IconoAbajo = () => (
  <svg {...base}><path d="m6 9.5 6 6 6-6" /></svg>
);
