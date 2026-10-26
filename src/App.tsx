import type { ReactNode } from 'react';
import { Router, useRuta, coincide } from './ui/router';
import { IconoEntrenar, IconoInicio, IconoMas, IconoNutricion, IconoProgreso } from './ui/componentes/Iconos';
import { Nutricion } from './ui/pantallas/Marcadores';
import { Mas } from './ui/pantallas/Mas';
import { Backup } from './ui/pantallas/Backup';

type Ruta = { patron: string; render: (p: Record<string, string>) => ReactNode };

function Logo() {
  return (
    <header className="encabezado">
      <h1 className="logo">FORJA</h1>
    </header>
  );
}

const RUTAS: Ruta[] = [
  { patron: '/', render: () => <Logo /> },
  { patron: '/entrenar', render: () => <h1 className="titulo">Entrenar</h1> },
  { patron: '/nutricion', render: () => <Nutricion /> },
  { patron: '/progreso', render: () => <h1 className="titulo">Progreso</h1> },
  { patron: '/mas', render: () => <Mas /> },
  { patron: '/mas/backup', render: () => <Backup /> },
];

const PESTANAS = [
  { a: '/', nombre: 'Inicio', Icono: IconoInicio },
  { a: '/entrenar', nombre: 'Entrenar', Icono: IconoEntrenar },
  { a: '/nutricion', nombre: 'Nutrición', Icono: IconoNutricion },
  { a: '/progreso', nombre: 'Progreso', Icono: IconoProgreso },
  { a: '/mas', nombre: 'Más', Icono: IconoMas },
];

function pestanaActiva(ruta: string): string {
  if (ruta === '/') return '/';
  return PESTANAS.find((p) => p.a !== '/' && (ruta === p.a || ruta.startsWith(p.a + '/')))?.a ?? '/';
}

function Pantalla() {
  const ruta = useRuta();
  for (const r of RUTAS) {
    const params = coincide(r.patron, ruta);
    if (params) return <>{r.render(params)}</>;
  }
  return <Logo />;
}

function Barra() {
  const activa = pestanaActiva(useRuta());
  return (
    <nav className="barra" aria-label="Secciones">
      {PESTANAS.map(({ a, nombre, Icono }) => (
        <a key={a} href={'#' + a} aria-current={activa === a ? 'page' : undefined}>
          <Icono />
          {nombre}
        </a>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <main className="app">
        <Pantalla />
      </main>
      <Barra />
    </Router>
  );
}
