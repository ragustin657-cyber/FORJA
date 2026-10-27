import type { ReactNode } from 'react';
import { Router, useRuta, coincide } from './ui/router';
import { IconoEntrenar, IconoInicio, IconoMas, IconoNutricion, IconoProgreso } from './ui/componentes/Iconos';
import { Nutricion } from './ui/pantallas/nutricion/Nutricion';
import { MiPlan } from './ui/pantallas/nutricion/MiPlan';
import { Semana } from './ui/pantallas/nutricion/Semana';
import { Plato } from './ui/pantallas/nutricion/Plato';
import { Compras } from './ui/pantallas/nutricion/Compras';
import { Hoy } from './ui/pantallas/nutricion/Hoy';
import { Agregar } from './ui/pantallas/nutricion/Agregar';
import type { TipoComida } from './core/nutricion/tipos';
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
import { CargarMedidas } from './ui/pantallas/cuerpo/CargarMedidas';
import { Camara } from './ui/pantallas/cuerpo/Camara';
import { DiaFotos } from './ui/pantallas/cuerpo/DiaFotos';
import { Comparar } from './ui/pantallas/cuerpo/Comparar';

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
  { patron: '/nutricion/compras', render: () => <Compras /> },
  { patron: '/nutricion/plato/:dia/:comida', render: (p) => <Plato key={p.dia + '-' + p.comida} dia={Number(p.dia)} comida={Number(p.comida)} /> },
  { patron: '/nutricion/hoy', render: () => <Hoy /> },
  { patron: '/nutricion/hoy/:fecha', render: (p) => <Hoy key={p.fecha} fecha={p.fecha} /> },
  { patron: '/nutricion/agregar/:fecha/:tipo', render: (p) => <Agregar key={p.fecha + p.tipo} fecha={p.fecha} tipo={p.tipo as TipoComida} /> },
  { patron: '/progreso', render: () => <Progreso /> },
  { patron: '/progreso/medidas', render: () => <CargarMedidas /> },
  { patron: '/progreso/fotos/nueva', render: () => <Camara /> },
  { patron: '/progreso/fotos/:fecha', render: (p) => <DiaFotos key={p.fecha} fecha={p.fecha} /> },
  { patron: '/progreso/comparar', render: () => <Comparar /> },
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
