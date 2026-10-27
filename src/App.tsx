import type { ReactNode } from 'react';
import { Router, useRuta, coincide } from './ui/router';
import { IconoEntrenar, IconoInicio, IconoMas, IconoNutricion, IconoProgreso } from './ui/componentes/Iconos';
import { Nutricion } from './ui/pantallas/nutricion/Nutricion';
import { MiPlan } from './ui/pantallas/nutricion/MiPlan';
import { Semana } from './ui/pantallas/nutricion/Semana';
import { Plato } from './ui/pantallas/nutricion/Plato';
import { Mas } from './ui/pantallas/Mas';
import { Backup } from './ui/pantallas/Backup';
import { Biblioteca } from './ui/pantallas/Biblioteca';
import { DetalleEjercicio } from './ui/pantallas/DetalleEjercicio';
import { Entrenar } from './ui/pantallas/Entrenar';
import { EditorRutina } from './ui/pantallas/EditorRutina';
import { Sesion } from './ui/pantallas/Sesion';
import { ResumenSesion } from './ui/pantallas/ResumenSesion';
import { Inicio } from './ui/pantallas/Inicio';
import { Ajustes } from './ui/pantallas/Ajustes';
import { Progreso } from './ui/pantallas/Progreso';
import { ProgresoEjercicio } from './ui/pantallas/ProgresoEjercicio';

type Ruta = { patron: string; render: (p: Record<string, string>) => ReactNode };

const RUTAS: Ruta[] = [
  { patron: '/', render: () => <Inicio /> },
  { patron: '/entrenar', render: () => <Entrenar /> },
  { patron: '/entrenar/rutina/:id', render: (p) => <EditorRutina key={p.id} id={p.id} /> },
  { patron: '/entrenar/sesion', render: () => <Sesion /> },
  { patron: '/entrenar/resumen/:id', render: (p) => <ResumenSesion key={p.id} id={p.id} /> },
  { patron: '/nutricion', render: () => <Nutricion /> },
  { patron: '/nutricion/plan', render: () => <MiPlan /> },
  { patron: '/nutricion/semana', render: () => <Semana /> },
  { patron: '/nutricion/plato/:dia/:comida', render: (p) => <Plato key={p.dia + '-' + p.comida} dia={Number(p.dia)} comida={Number(p.comida)} /> },
  { patron: '/progreso', render: () => <Progreso /> },
  { patron: '/progreso/ejercicio/:id', render: (p) => <ProgresoEjercicio key={p.id} id={p.id} /> },
  { patron: '/mas', render: () => <Mas /> },
  { patron: '/mas/backup', render: () => <Backup /> },
  { patron: '/mas/ajustes', render: () => <Ajustes /> },
  { patron: '/mas/biblioteca', render: () => <Biblioteca /> },
  { patron: '/mas/biblioteca/:id', render: (p) => <DetalleEjercicio key={p.id} id={p.id} /> },
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
  return <Inicio />;
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
