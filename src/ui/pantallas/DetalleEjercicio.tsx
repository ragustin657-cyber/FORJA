import { EQUIPOS, MUSCULOS } from '../../core/biblioteca';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { Encabezado } from '../componentes/Encabezado';
import { IconoEstrella } from '../componentes/Iconos';
import { Tarjeta } from '../componentes/Tarjeta';
import { urlImagen, useCarga } from '../datos';
import { Enlace } from '../router';

export function DetalleEjercicio({ id }: { id: string }) {
  const { datos: e, recargar } = useCarga(() => ejerciciosRepo.porId(id), [id]);
  if (e === undefined) return <Encabezado titulo="Ejercicio" atras />;

  return (
    <>
      <Encabezado
        titulo=""
        atras
        accion={
          <button
            type="button"
            className="boton-icono"
            style={{ color: e.favorito ? 'var(--color-dorado)' : undefined }}
            aria-label={e.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
            onClick={async () => {
              await ejerciciosRepo.alternarFavorito(e.id);
              recargar();
            }}
          >
            <IconoEstrella llena={e.favorito} />
          </button>
        }
      />
      <div className="pila">
        <h2 className="titulo" style={{ fontSize: 24 }}>{e.nombre}</h2>
        <p className="texto-2" style={{ margin: 0 }}>
          {e.musculos.map((m) => MUSCULOS[m] ?? m).join(' · ')} · {EQUIPOS[e.equipo] ?? e.equipo}
        </p>
        {e.imagenes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${e.imagenes.length}, 1fr)`, gap: 8 }}>
            {e.imagenes.map((ruta, i) => (
              <img
                key={ruta}
                src={urlImagen(ruta)}
                alt={`${e.nombre}: ${i === 0 ? 'posición inicial' : 'posición final'}`}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12, background: '#fff' }}
              />
            ))}
          </div>
        )}
        {e.instrucciones.length > 0 && (
          <Tarjeta>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Cómo hacerlo</h3>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {e.instrucciones.map((paso, i) => (
                <li key={i}>{paso}</li>
              ))}
            </ol>
          </Tarjeta>
        )}
        <Enlace a={'/progreso/ejercicio/' + encodeURIComponent(e.id)} className="boton boton-secundario">
          Ver mi progreso en este ejercicio
        </Enlace>
      </div>
    </>
  );
}
