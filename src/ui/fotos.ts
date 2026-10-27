// Ayudas para mostrar fotos de progreso guardadas.
import { useEffect, useState } from 'react';
import { cuerpoRepo } from '../data/repos/cuerpo';

/** URL temporal de la imagen (o miniatura) de una foto; se libera al desmontar. */
export function useImagen(id: string | undefined, tipo: 'imagen' | 'miniatura' = 'imagen', version = 0): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!id) return;
    let creada: string | null = null;
    let vivo = true;
    cuerpoRepo.imagen(id).then((img) => {
      if (!vivo || !img) return;
      creada = URL.createObjectURL(img[tipo]);
      setUrl(creada);
    });
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [id, tipo, version]);
  return url;
}

function partes(fecha: string): [number, number, number] {
  const [a, m, d] = fecha.split('-').map(Number);
  return [a, m, d];
}
/** "13/10/2026" */
export const fechaLarga = (fecha: string) => { const [a, m, d] = partes(fecha); return `${d}/${m}/${a}`; };
/** "13/10" */
export const fechaCorta = (fecha: string) => { const [, m, d] = partes(fecha); return `${d}/${m}`; };
