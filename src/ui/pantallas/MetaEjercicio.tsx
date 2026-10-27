import { useState } from 'react';
import { numero } from '../../core/formato';
import { avance, faltaKg, fechaMeta, objetivoMeta, textoMeta, validarMeta, type Meta } from '../../core/metas';
import type { Proyeccion } from '../../core/proyeccion';
import { metasRepo } from '../../data/repos/metas';
import { Boton } from '../componentes/Boton';
import { Dialogo } from '../componentes/Dialogo';
import { useCarga } from '../datos';

/** Tarjeta de la meta de un ejercicio: poner, editar, quitar y ver la fecha estimada. */
export function MetaEjercicio({ ejercicioId, proyeccion, mejor }: { ejercicioId: string; proyeccion: Proyeccion; mejor: number | null }) {
  const { datos, recargar } = useCarga(async () => ({ meta: (await metasRepo.de(ejercicioId)) ?? null }), [ejercicioId]);
  const [editando, setEditando] = useState(false);
  const [peso, setPeso] = useState('');
  const [reps, setReps] = useState('1');
  const [errores, setErrores] = useState<string[]>([]);
  const [quitar, setQuitar] = useState(false);
  if (!datos) return null;
  const { meta } = datos;

  const abrir = (m: Meta | null) => {
    setPeso(m ? numero(m.peso) : '');
    setReps(m ? String(m.reps) : '1');
    setErrores([]);
    setEditando(true);
  };

  async function guardar() {
    const r = validarMeta(peso, reps);
    setErrores(r.errores);
    if (!r.valores) return;
    await metasRepo.guardar({ id: ejercicioId, ...r.valores, creada: Date.now() });
    setEditando(false);
    await recargar();
  }

  let contenido;
  if (editando) {
    contenido = (
      <div className="pila">
        <div className="fila" style={{ gap: 8 }}>
          <label className="campo" style={{ flex: 2 }}>
            Peso (kg)
            <input className="entrada" inputMode="decimal" aria-label="Peso (kg)" value={peso} onChange={(e) => setPeso(e.target.value)} />
          </label>
          <label className="campo" style={{ flex: 1 }}>
            Repeticiones
            <input className="entrada" inputMode="numeric" aria-label="Repeticiones" value={reps} onChange={(e) => setReps(e.target.value)} />
          </label>
        </div>
        {errores.map((e) => (
          <p key={e} className="error" style={{ margin: 0 }}>{e}</p>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Boton variante="secundario" onClick={() => setEditando(false)}>Cancelar</Boton>
          <Boton onClick={guardar}>Guardar</Boton>
        </div>
      </div>
    );
  } else if (!meta) {
    contenido = (
      <>
        <p className="texto-2" style={{ margin: 0 }}>Poné un peso objetivo y te decimos cuándo podrías llegar.</p>
        <Boton variante="secundario" onClick={() => abrir(null)}>Poner meta</Boton>
      </>
    );
  } else {
    const objetivo = objetivoMeta(meta);
    const pct = avance(mejor, objetivo);
    const estado = fechaMeta(proyeccion, objetivo, mejor);
    contenido = (
      <>
        <strong className="numeros" style={{ fontSize: 20 }}>{`${numero(meta.peso)} kg × ${meta.reps}`}</strong>
        <div className="barra-meta" role="progressbar" aria-label="Avance hacia la meta" aria-valuenow={Math.round(pct * 100)} aria-valuemax={100}>
          <span style={{ width: `${pct * 100}%` }} />
        </div>
        {estado.tipo !== 'lograda' && <span className="numeros">{`Te faltan ${numero(faltaKg(mejor, objetivo))} kg`}</span>}
        <span style={{ color: estado.tipo === 'lograda' ? 'var(--color-dorado)' : undefined }}>{textoMeta(estado)}</span>
        <div className="fila" style={{ gap: 8 }}>
          <Boton variante="secundario" onClick={() => abrir(meta)}>Editar</Boton>
          <Boton variante="peligro" onClick={() => setQuitar(true)}>Quitar meta</Boton>
        </div>
      </>
    );
  }

  return (
    <section aria-label="Meta" className="tarjeta pila">
      <h2 style={{ fontSize: 16 }}>Meta</h2>
      {contenido}
      {quitar && (
        <Dialogo
          titulo="¿Quitar la meta?"
          confirmar="Quitar"
          peligro
          onCancelar={() => setQuitar(false)}
          onConfirmar={async () => {
            await metasRepo.quitar(ejercicioId);
            setQuitar(false);
            await recargar();
          }}
        />
      )}
    </section>
  );
}
