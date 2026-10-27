import { fotosPorFecha, POSES, type Foto } from '../../../core/cuerpo/fotos';
import { cuerpoRepo } from '../../../data/repos/cuerpo';
import { useCarga } from '../../datos';
import { fechaCorta, fechaLarga, useImagen } from '../../fotos';
import { Enlace } from '../../router';

function Miniatura({ foto }: { foto: Foto }) {
  const url = useImagen(foto.id, 'miniatura', foto.creado);
  const nombre = POSES.find((p) => p.id === foto.pose)!.nombre;
  return url ? (
    <img src={url} alt={`${nombre} del ${fechaCorta(foto.fecha)}`} className="foto-mini" />
  ) : (
    <span className="foto-mini" role="img" aria-label={`${nombre} del ${fechaCorta(foto.fecha)}`} />
  );
}

export function Fotos() {
  const { datos: fotos } = useCarga(() => cuerpoRepo.fotos());
  if (!fotos) return null;
  const grupos = fotosPorFecha(fotos);

  return (
    <section aria-label="Fotos" className="tarjeta pila">
      <div className="fila-entre">
        <span className="subtitulo" style={{ margin: 0 }}>Fotos</span>
        <Enlace a="/progreso/fotos/nueva" className="chip">Sacar fotos</Enlace>
      </div>
      {grupos.length === 0 ? (
        <p className="texto-2" style={{ margin: 0 }}>Sacate fotos de frente, perfil y espalda cada 2 semanas. Quedan solo en este iPhone.</p>
      ) : (
        <div className="pila" style={{ gap: 10 }}>
          {grupos.map((g) => (
            <Enlace key={g.fecha} a={`/progreso/fotos/${g.fecha}`} aria-label={`Fotos del ${fechaLarga(g.fecha)}`} className="pila" style={{ gap: 4 }}>
              <span className="texto-2" style={{ fontSize: 13 }}>{fechaLarga(g.fecha)}</span>
              <span className="foto-fila">
                {POSES.map((p) =>
                  g.poses[p.id] ? <Miniatura key={p.id} foto={g.poses[p.id]!} /> : <span key={p.id} className="foto-mini foto-vacia" aria-label={`Sin foto de ${p.nombre.toLowerCase()}`} />,
                )}
              </span>
            </Enlace>
          ))}
        </div>
      )}
      {grupos.length >= 2 ? (
        <Enlace a="/progreso/comparar" className="boton boton-secundario boton-ancho">Comparar</Enlace>
      ) : (
        grupos.length === 1 && <button type="button" className="boton boton-secundario boton-ancho" disabled>Comparar</button>
      )}
    </section>
  );
}
