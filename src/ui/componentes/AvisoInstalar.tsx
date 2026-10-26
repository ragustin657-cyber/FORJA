import { useState } from 'react';
import { estaInstalada, mostrarAvisoInstalar } from '../../data/persistencia';

const CLAVE = 'forja.avisoInstalarCerrado';

function leerCerrado(): number | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function AvisoInstalar() {
  const [visible, setVisible] = useState(() => mostrarAvisoInstalar(estaInstalada(), leerCerrado(), Date.now()));
  if (!visible) return null;

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {
      /* sin almacenamiento: el aviso vuelve la próxima vez */
    }
    setVisible(false);
  }

  return (
    <section className="aviso aviso-dorado" aria-label="Instalar FORJA" style={{ marginBottom: 16, position: 'relative', paddingRight: 48 }}>
      <strong>Instalá FORJA en tu iPhone</strong>
      <p style={{ margin: '6px 0 0', fontSize: 14 }}>
        En Safari tocá <strong>Compartir</strong> (el cuadrado con la flecha) y después <strong>Agregar a inicio</strong>. Así funciona sin
        internet y tus datos quedan guardados de forma segura.
      </p>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={cerrar}
        className="boton-icono"
        style={{ position: 'absolute', top: 4, right: 4, background: 'transparent' }}
      >
        ✕
      </button>
    </section>
  );
}
