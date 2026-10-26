import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Ruta actual a partir del hash ("#/entrenar" → "/entrenar"). */
function leerRuta(): string {
  const r = location.hash.replace(/^#/, '');
  return r === '' ? '/' : r;
}

const ContextoRuta = createContext<string>('/');

export function Router({ children }: { children: ReactNode }) {
  const [ruta, setRuta] = useState(leerRuta);
  useEffect(() => {
    const alCambiar = () => {
      setRuta(leerRuta());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return <ContextoRuta.Provider value={ruta}>{children}</ContextoRuta.Provider>;
}

export function useRuta(): string {
  return useContext(ContextoRuta);
}

export function navegar(ruta: string) {
  location.hash = ruta;
}

export function volver() {
  history.back();
}

/** Compara una ruta con un patrón como "/entrenar/rutina/:id". Devuelve los parámetros o null. */
export function coincide(patron: string, ruta: string): Record<string, string> | null {
  const p = patron.split('/');
  const r = ruta.split('?')[0].split('/');
  if (p.length !== r.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(r[i]);
    else if (p[i] !== r[i]) return null;
  }
  return params;
}

export function Enlace({ a, children, className, ...resto }: { a: string; children: ReactNode; className?: string; [k: string]: unknown }) {
  return (
    <a href={'#' + a} className={className} {...resto}>
      {children}
    </a>
  );
}
