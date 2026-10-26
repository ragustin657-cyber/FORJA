import { createRoot } from 'react-dom/client';
import App from './App';
import { usarAlmacen } from './data/db';
import { crearAlmacenIDB } from './data/idb';
import { estaInstalada, pedirPersistencia } from './data/persistencia';
import { prepararBiblioteca } from './ui/datos';

if (estaInstalada()) void pedirPersistencia();

const raiz = createRoot(document.getElementById('raiz')!);

crearAlmacenIDB()
  .then(async (almacen) => {
    usarAlmacen(almacen);
    await prepararBiblioteca();
    raiz.render(<App />);
  })
  .catch(() => {
    raiz.render(
      <main className="app">
        <h1 className="logo">FORJA</h1>
        <p className="error">No se pudo abrir el almacenamiento del teléfono. Cerrá la app y volvé a abrirla.</p>
      </main>,
    );
  });
