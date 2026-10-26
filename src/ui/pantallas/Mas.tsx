import { Encabezado } from '../componentes/Encabezado';
import { Enlace } from '../router';

const OPCIONES = [
  { a: '/mas/biblioteca', titulo: 'Biblioteca de ejercicios', detalle: 'Imágenes e instrucciones' },
  { a: '/mas/ajustes', titulo: 'Ajustes', detalle: 'Incremento de peso' },
  { a: '/mas/backup', titulo: 'Copia de seguridad', detalle: 'Exportar y restaurar tus datos' },
];

export function Mas() {
  return (
    <>
      <Encabezado titulo="Más" />
      <div className="pila">
        {OPCIONES.map((o) => (
          <Enlace key={o.a} a={o.a} className="tarjeta fila-entre">
            <span>
              <strong>{o.titulo}</strong>
              <br />
              <span className="texto-2" style={{ fontSize: 14 }}>{o.detalle}</span>
            </span>
            <span className="texto-2" aria-hidden>›</span>
          </Enlace>
        ))}
      </div>
      <p className="texto-2" style={{ fontSize: 13, marginTop: 28 }}>
        Forja da recomendaciones generales de entrenamiento y alimentación basadas en fórmulas estándar. No reemplaza a un médico,
        nutricionista o entrenador matriculado.
      </p>
    </>
  );
}
