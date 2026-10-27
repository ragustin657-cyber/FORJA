import ejerciciosJson from '../../contenido/ejercicios.json';
import patronesJson from '../../contenido/patrones.json';
import { EQUIPOS } from '../../core/biblioteca';
import { alternativas } from '../../core/gimnasio';
import type { Patrones } from '../../core/planes';
import { resumenSeries } from '../../core/sesion';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import type { Ejercicio, EjercicioEnDia } from '../../data/tipos';
import { infoEjercicio, type InfoEjercicio } from '../acciones';
import { useCarga } from '../datos';
import { Boton } from './Boton';
import { Miniatura } from './SelectorEjercicios';

const TRADUCIDOS = new Set((ejerciciosJson as { id: string; traducido: boolean }[]).filter((e) => e.traducido).map((e) => e.id));

export type Elegido = { ejercicio: Ejercicio; info: InfoEjercicio };

/** "Está ocupada": hasta 5 ejercicios equivalentes, con su última marca, para cambiar en la sesión. */
export function PanelAlternativas({ nombre, base, enSesion, onElegir, onCerrar }: {
  nombre: string;
  base: EjercicioEnDia;
  enSesion: Set<string>;
  onElegir: (e: Elegido) => void;
  onCerrar: () => void;
}) {
  const { datos } = useCarga(async () => {
    const todos = await ejerciciosRepo.todos();
    const ids = alternativas(base.ejercicioId, todos, patronesJson as Patrones, TRADUCIDOS, enSesion);
    const porId = new Map(todos.map((e) => [e.id, e]));
    return Promise.all(ids.map(async (id) => ({ ejercicio: porId.get(id)!, info: await infoEjercicio({ ...base, ejercicioId: id }) })));
  }, [base.ejercicioId]);

  return (
    <div className="dialogo-fondo" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={`Alternativas a ${nombre}`} className="dialogo pila" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <strong style={{ fontSize: 18 }}>¿Está ocupada? Cambiala por:</strong>
        {!datos && <p className="texto-2">Buscando alternativas…</p>}
        {datos?.length === 0 && <p className="texto-2">No encontramos ejercicios equivalentes.</p>}
        {datos?.map(({ ejercicio, info }) => {
          const ultima = resumenSeries(info.ultima);
          return (
            <button
              key={ejercicio.id}
              type="button"
              className="tarjeta fila"
              style={{ padding: 10, textAlign: 'left', width: '100%', cursor: 'pointer' }}
              aria-label={`Usar ${ejercicio.nombre}`}
              onClick={() => onElegir({ ejercicio, info })}
            >
              <Miniatura e={ejercicio} tam={48} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{ejercicio.nombre}</strong>
                <br />
                <span className="texto-2" style={{ fontSize: 13 }}>
                  {EQUIPOS[ejercicio.equipo] ?? ejercicio.equipo}
                  {ultima ? ` · la última vez: ${ultima}` : ''}
                </span>
              </span>
            </button>
          );
        })}
        <Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton>
      </div>
    </div>
  );
}
