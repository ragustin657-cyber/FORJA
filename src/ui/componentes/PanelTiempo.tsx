import { useState } from 'react';
import { planRecorte, type ItemTiempo, type Recorte } from '../../core/gimnasio';
import { Boton } from './Boton';

const OPCIONES = [30, 45, 60] as const;

function lista(nombres: string[]): string {
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** Vista previa del recorte en palabras. */
export function textoRecorte(r: Recorte, minutos: number, nombre: (id: string) => string): string {
  const cambios: string[] = [];
  if (r.quitar.length) cambios.push(`se saca ${lista(r.quitar.map(nombre))}`);
  for (const x of r.reducir) cambios.push(`${nombre(x.ejercicioId)} queda en 2 series`);
  if (r.descansoMaxSeg) cambios.push(`descansos de ${r.descansoMaxSeg} s`);
  const queda = `queda en ~${Math.round(r.minutos)} min`;
  if (!cambios.length) return `Te alcanza: ${queda}.`;
  return `Queda en ~${Math.round(r.minutos)} min: ${cambios.join(', ')}.${r.alcanza ? '' : ` No llega a ${minutos} min sin tocar los básicos.`}`;
}

/** "Hoy tengo poco tiempo": elegís los minutos, ves qué se recorta y lo aplicás. */
export function PanelTiempo({ items, nombre, onAplicar, onCerrar }: {
  items: ItemTiempo[];
  nombre: (id: string) => string;
  onAplicar: (r: Recorte) => void;
  onCerrar: () => void;
}) {
  const [minutos, setMinutos] = useState<number | null>(null);
  const recorte = minutos === null ? null : planRecorte(items, minutos);
  const sinCambios = recorte !== null && !recorte.quitar.length && !recorte.reducir.length && !recorte.descansoMaxSeg;
  return (
    <div className="dialogo-fondo" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label="¿Cuánto tiempo tenés?" className="dialogo pila" onClick={(e) => e.stopPropagation()}>
        <strong style={{ fontSize: 18 }}>¿Cuánto tiempo tenés?</strong>
        <div role="radiogroup" aria-label="Minutos" className="chips">
          {OPCIONES.map((m) => (
            <label key={m} className="chip" aria-pressed={minutos === m}>
              <input type="radio" name="minutos" checked={minutos === m} onChange={() => setMinutos(m)} aria-label={`${m} min`} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              {m} min
            </label>
          ))}
        </div>
        {recorte && <p style={{ margin: 0 }}>{textoRecorte(recorte, minutos!, nombre)}</p>}
        <p className="texto-2" style={{ margin: 0, fontSize: 13 }}>Los básicos no se tocan. Solo cambia lo que falta de hoy; tu rutina queda igual.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton disabled={!recorte || sinCambios} onClick={() => recorte && onAplicar(recorte)}>Aplicar</Boton>
        </div>
      </div>
    </div>
  );
}
