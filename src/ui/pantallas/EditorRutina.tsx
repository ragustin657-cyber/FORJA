import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { nuevoId } from '../../data/db';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { rutinasRepo } from '../../data/repos/rutinas';
import type { DiaRutina, Ejercicio, EjercicioEnDia, Rutina } from '../../data/tipos';
import { Boton } from '../componentes/Boton';
import { Encabezado } from '../componentes/Encabezado';
import { IconoAbajo, IconoArriba, IconoBasura } from '../componentes/Iconos';
import { Miniatura, SelectorEjercicios } from '../componentes/SelectorEjercicios';
import { Stepper } from '../componentes/Stepper';
import { useCarga } from '../datos';
import { navegar } from '../router';

const nuevoDia = (n: number): DiaRutina => ({ id: nuevoId(), nombre: `Día ${String.fromCharCode(64 + n)}`, ejercicios: [] });
const nuevaRutina = (): Rutina => ({ id: nuevoId(), nombre: '', origen: 'manual', dias: [nuevoDia(1)], archivado: false, creada: Date.now() });

function mover<T>(lista: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

function FilaEjercicio({ item, ejercicio, onCambio, onSubir, onBajar, onBorrar }: {
  item: EjercicioEnDia;
  ejercicio?: Ejercicio;
  onCambio: (e: EjercicioEnDia) => void;
  onSubir: () => void;
  onBajar: () => void;
  onBorrar: () => void;
}) {
  const nombre = ejercicio?.nombre ?? 'Ejercicio';
  const campo = (etiqueta: string, clave: keyof EjercicioEnDia, paso: number, min: number) => (
    <label className="campo" style={{ fontSize: 12 }}>
      {etiqueta}
      <Stepper
        compacto
        etiqueta={`${etiqueta} de ${nombre}`}
        valor={item[clave] as number}
        paso={paso}
        min={min}
        onCambio={(v) => onCambio({ ...item, [clave]: Math.max(min, Math.round(v ?? min)) })}
      />
    </label>
  );
  return (
    <div className="pila" style={{ borderTop: '1px solid var(--color-linea)', paddingTop: 12 }}>
      <div className="fila">
        {ejercicio && <Miniatura e={ejercicio} tam={44} />}
        <strong style={{ flex: 1 }}>{nombre}</strong>
        <button type="button" className="boton-icono" aria-label={`Subir ${nombre}`} onClick={onSubir}><IconoArriba /></button>
        <button type="button" className="boton-icono" aria-label={`Bajar ${nombre}`} onClick={onBajar}><IconoAbajo /></button>
        <button type="button" className="boton-icono" aria-label={`Quitar ${nombre}`} onClick={onBorrar}><IconoBasura /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {campo('Series', 'series', 1, 1)}
        {campo('Descanso (seg)', 'descansoSeg', 15, 0)}
        {campo('Reps mínimas', 'repsMin', 1, 1)}
        {campo('Reps máximas', 'repsMax', 1, 1)}
      </div>
    </div>
  );
}

export function EditorRutina({ id }: { id: string }) {
  const esNueva = id === 'nueva';
  const { datos: ejercicios } = useCarga(() => ejerciciosRepo.todos());
  const [rutina, setRutina] = useState<Rutina | null>(esNueva ? nuevaRutina() : null);
  const [eligiendoPara, setEligiendoPara] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombres, setNombres] = useState<Record<string, Ejercicio>>({});
  // Al volver del selector, la pantalla queda donde estabas en vez de saltar arriba.
  const scrollGuardado = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (eligiendoPara) {
      window.scrollTo(0, 0);
    } else if (scrollGuardado.current !== null) {
      window.scrollTo(0, scrollGuardado.current);
      scrollGuardado.current = null;
    }
  }, [eligiendoPara]);
  const abrirSelector = (diaId: string) => {
    scrollGuardado.current = window.scrollY;
    setEligiendoPara(diaId);
  };

  useEffect(() => {
    if (!esNueva) rutinasRepo.porId(id).then((r) => setRutina(r ?? null));
  }, [id, esNueva]);

  useEffect(() => {
    if (!rutina) return;
    const faltan = rutina.dias.flatMap((d) => d.ejercicios.map((e) => e.ejercicioId)).filter((x) => !nombres[x]);
    if (faltan.length === 0) return;
    Promise.all(faltan.map((x) => ejerciciosRepo.porId(x))).then((lista) =>
      setNombres((prev) => ({ ...prev, ...Object.fromEntries(lista.filter(Boolean).map((e) => [e!.id, e!])) })),
    );
  }, [rutina, nombres]);

  if (!rutina) return <Encabezado titulo="Rutina" atras />;

  const cambiarDia = (diaId: string, cambio: (d: DiaRutina) => DiaRutina) =>
    setRutina({ ...rutina, dias: rutina.dias.map((d) => (d.id === diaId ? cambio(d) : d)) });

  if (eligiendoPara && ejercicios) {
    return (
      <>
        <Encabezado titulo="Elegí un ejercicio" accion={<Boton variante="secundario" onClick={() => setEligiendoPara(null)}>Cancelar</Boton>} />
        <SelectorEjercicios
          ejercicios={ejercicios}
          accion={(e) => `Agregar ${e.nombre}`}
          onElegir={(e) => {
            setNombres((prev) => ({ ...prev, [e.id]: e }));
            cambiarDia(eligiendoPara, (d) => ({
              ...d,
              ejercicios: [...d.ejercicios, { ejercicioId: e.id, series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }],
            }));
            setEligiendoPara(null);
          }}
        />
      </>
    );
  }

  async function guardar() {
    if (!rutina) return;
    if (rutina.nombre.trim() === '') return setError('Poné un nombre para la rutina.');
    if (rutina.dias.some((d) => d.ejercicios.some((e) => e.repsMin > e.repsMax)))
      return setError('Las reps mínimas no pueden ser más que las máximas.');
    await rutinasRepo.guardar({ ...rutina, nombre: rutina.nombre.trim() });
    navegar('/entrenar');
  }

  return (
    <>
      <Encabezado titulo={esNueva ? 'Nueva rutina' : 'Editar rutina'} atras />
      <div className="pila">
        <label className="campo">
          Nombre de la rutina
          <input
            className="entrada"
            aria-label="Nombre de la rutina"
            placeholder="Ej.: Fuerza 4 días"
            value={rutina.nombre}
            onChange={(e) => setRutina({ ...rutina, nombre: e.target.value })}
          />
        </label>

        {rutina.dias.map((d, i) => (
          <section key={d.id} className="tarjeta pila" aria-label={d.nombre}>
            <div className="fila">
              <input
                className="entrada"
                style={{ fontWeight: 700 }}
                aria-label={`Nombre del día ${i + 1}`}
                value={d.nombre}
                onChange={(e) => cambiarDia(d.id, (x) => ({ ...x, nombre: e.target.value }))}
              />
              {rutina.dias.length > 1 && (
                <button
                  type="button"
                  className="boton-icono"
                  aria-label={`Quitar ${d.nombre}`}
                  onClick={() => setRutina({ ...rutina, dias: rutina.dias.filter((x) => x.id !== d.id) })}
                >
                  <IconoBasura />
                </button>
              )}
            </div>
            {d.ejercicios.map((item, j) => (
              <FilaEjercicio
                key={item.ejercicioId + j}
                item={item}
                ejercicio={nombres[item.ejercicioId]}
                onCambio={(nuevo) => cambiarDia(d.id, (x) => ({ ...x, ejercicios: x.ejercicios.map((e, k) => (k === j ? nuevo : e)) }))}
                onSubir={() => cambiarDia(d.id, (x) => ({ ...x, ejercicios: mover(x.ejercicios, j, -1) }))}
                onBajar={() => cambiarDia(d.id, (x) => ({ ...x, ejercicios: mover(x.ejercicios, j, 1) }))}
                onBorrar={() => cambiarDia(d.id, (x) => ({ ...x, ejercicios: x.ejercicios.filter((_, k) => k !== j) }))}
              />
            ))}
            <Boton variante="secundario" onClick={() => abrirSelector(d.id)}>Agregar ejercicio</Boton>
          </section>
        ))}

        <Boton variante="secundario" onClick={() => setRutina({ ...rutina, dias: [...rutina.dias, nuevoDia(rutina.dias.length + 1)] })}>
          Agregar día
        </Boton>
        {error && <p className="error" role="alert">{error}</p>}
        <Boton ancho onClick={guardar}>Guardar rutina</Boton>
        {!esNueva && (
          <Boton
            variante="peligro"
            ancho
            onClick={async () => {
              if (!confirm('¿Eliminar esta rutina? Tu historial de entrenamientos se conserva.')) return;
              await rutinasRepo.archivar(rutina.id);
              navegar('/entrenar');
            }}
          >
            Eliminar rutina
          </Boton>
        )}
      </div>
    </>
  );
}
