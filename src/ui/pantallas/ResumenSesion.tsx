import { duracion } from '../../core/formato';
import { sesionesRepo } from '../../data/repos/sesiones';
import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';
import { Enlace } from '../router';

export function ResumenSesion({ id }: { id: string }) {
  const { datos: sesion } = useCarga(() => sesionesRepo.porId(id), [id]);
  if (!sesion) return <Encabezado titulo="Resumen" />;
  const hechas = sesion.series.filter((x) => x.completada).length;
  return (
    <>
      <Encabezado titulo="Resumen" />
      <div className="pila">
        <Tarjeta className="pila" style={{ textAlign: 'center' }}>
          <h2 className="titulo" style={{ color: 'var(--color-dorado)' }}>¡Entrenamiento terminado!</h2>
          <p className="texto-2" style={{ margin: 0 }}>
            {duracion((sesion.fin ?? Date.now()) - sesion.inicio)} · {hechas} series
          </p>
        </Tarjeta>
        <Enlace a="/" className="boton boton-primario">Volver al inicio</Enlace>
      </div>
    </>
  );
}
