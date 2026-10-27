import { useState } from 'react';
import { POSES, type Foto } from '../../../core/cuerpo/fotos';
import { cuerpoRepo } from '../../../data/repos/cuerpo';
import { Dialogo } from '../../componentes/Dialogo';
import { Encabezado } from '../../componentes/Encabezado';
import { IconoBasura } from '../../componentes/Iconos';
import { useCarga } from '../../datos';
import { fechaCorta, fechaLarga, useImagen } from '../../fotos';

function Grande({ foto, onBorrar }: { foto: Foto; onBorrar: () => void }) {
  const url = useImagen(foto.id, 'imagen', foto.creado);
  const nombre = POSES.find((p) => p.id === foto.pose)!.nombre;
  return (
    <figure className="foto-grande">
      {url ? <img src={url} alt={`${nombre} del ${fechaCorta(foto.fecha)}`} /> : <span className="foto-vacia" />}
      <figcaption className="fila-entre">
        <span>{nombre}</span>
        <button type="button" className="boton-icono" aria-label={`Borrar foto de ${nombre.toLowerCase()}`} onClick={onBorrar}>
          <IconoBasura />
        </button>
      </figcaption>
    </figure>
  );
}

export function DiaFotos({ fecha }: { fecha: string }) {
  const { datos, recargar } = useCarga(async () => (await cuerpoRepo.fotos()).filter((f) => f.fecha === fecha));
  const [borrar, setBorrar] = useState<Foto | null>(null);
  const fotos = datos ? POSES.flatMap((p) => datos.filter((f) => f.pose === p.id)) : [];

  return (
    <>
      <Encabezado titulo={`Fotos del ${fechaLarga(fecha)}`} atras />
      {datos && fotos.length === 0 && <div className="tarjeta vacio">No hay fotos de este día.</div>}
      <div className="foto-carrusel">
        {fotos.map((f) => (
          <Grande key={f.id} foto={f} onBorrar={() => setBorrar(f)} />
        ))}
      </div>
      {borrar && (
        <Dialogo
          titulo="¿Borrar esta foto?"
          confirmar="Borrar"
          peligro
          onCancelar={() => setBorrar(null)}
          onConfirmar={async () => {
            await cuerpoRepo.borrarFoto(borrar.id);
            setBorrar(null);
            await recargar();
          }}
        >
          La foto se borra de este iPhone. Si está en una copia de seguridad, ahí se conserva.
        </Dialogo>
      )}
    </>
  );
}
