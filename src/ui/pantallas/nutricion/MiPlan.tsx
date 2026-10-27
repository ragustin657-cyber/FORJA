import { useEffect, useState } from 'react';
import type { Actividad, ObjetivoNutri, Sexo } from '../../../core/nutricion/calorias';
import { validarPerfil, type Perfil } from '../../../core/nutricion/perfil';
import { GRUPOS, type Grupo } from '../../../core/nutricion/tipos';
import { parsearNumero } from '../../../core/unidades';
import { nutricionRepo } from '../../../data/repos/nutricion';
import { Boton } from '../../componentes/Boton';
import { Encabezado } from '../../componentes/Encabezado';
import { Tarjeta } from '../../componentes/Tarjeta';
import { navegar } from '../../router';

const ACTIVIDADES: { valor: Actividad; nombre: string; ejemplo: string }[] = [
  { valor: 'sedentario', nombre: 'Sedentario', ejemplo: 'Trabajo sentado y casi no entreno' },
  { valor: 'liviano', nombre: 'Liviano', ejemplo: 'Entreno 1 a 3 veces por semana' },
  { valor: 'moderado', nombre: 'Moderado', ejemplo: 'Entreno 3 a 5 veces por semana' },
  { valor: 'alto', nombre: 'Alto', ejemplo: 'Entreno 6 a 7 veces por semana' },
  { valor: 'muyAlto', nombre: 'Muy alto', ejemplo: 'Trabajo físico y entreno todos los días' },
];
const OBJETIVOS: { valor: ObjetivoNutri; nombre: string }[] = [
  { valor: 'bajar', nombre: 'Bajar grasa' },
  { valor: 'mantener', nombre: 'Mantener' },
  { valor: 'ganar', nombre: 'Ganar músculo' },
];

/** Grupo de opciones de una sola elección, con chips grandes. */
function Opciones<T extends string | number>({ nombre, valor, opciones, onCambio }: {
  nombre: string;
  valor: T | undefined;
  opciones: { valor: T; nombre: string; detalle?: string }[];
  onCambio: (v: T) => void;
}) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="texto-2" style={{ fontSize: 14, marginBottom: 6 }}>{nombre}</legend>
      <div role="radiogroup" aria-label={nombre} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {opciones.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            className="chip"
            aria-pressed={valor === o.valor}
            style={{ minHeight: 44, ...(o.detalle ? { width: '100%', justifyContent: 'space-between', borderRadius: 12 } : {}) }}
            onClick={() => onCambio(o.valor)}
          >
            <span>{o.nombre}</span>
            {o.detalle && <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.8 }}>{o.detalle}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function MiPlan() {
  const [cargado, setCargado] = useState(false);
  const [primeraVez, setPrimeraVez] = useState(true);
  const [sexo, setSexo] = useState<Sexo>();
  const [nacimiento, setNacimiento] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [actividad, setActividad] = useState<Actividad>();
  const [objetivo, setObjetivo] = useState<ObjetivoNutri>();
  const [comidas, setComidas] = useState<3 | 4 | 5>(4);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [otros, setOtros] = useState('');
  const [errores, setErrores] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([nutricionRepo.perfil(), nutricionRepo.pesoActual()]).then(([p, kg]) => {
      if (p) {
        setPrimeraVez(false);
        setSexo(p.sexo);
        setNacimiento(p.nacimiento);
        setAltura(String(p.alturaCm));
        setActividad(p.actividad);
        setObjetivo(p.objetivo);
        setComidas(p.comidas);
        setGrupos(p.noComoGrupos);
        setOtros(p.noComoTexto.join(', '));
      }
      if (kg !== undefined) setPeso(String(kg).replace('.', ','));
      setCargado(true);
    });
  }, []);

  async function guardar() {
    const pesoKg = parsearNumero(peso) ?? undefined;
    const datos = {
      id: 'yo' as const,
      sexo,
      nacimiento,
      alturaCm: parsearNumero(altura) ?? undefined,
      actividad,
      objetivo,
      comidas,
      noComoGrupos: grupos,
      noComoTexto: otros.split(',').map((x) => x.trim()).filter(Boolean),
      pesoKg,
    };
    const problemas = validarPerfil(datos, new Date());
    setErrores(problemas);
    if (problemas.length > 0) return;
    const { pesoKg: _p, ...perfil } = datos;
    await nutricionRepo.guardarPerfil(perfil as Perfil, pesoKg!, Date.now());
    navegar('/nutricion');
  }

  if (!cargado) return <Encabezado titulo="Mi plan" atras />;

  return (
    <>
      <Encabezado titulo="Mi plan" atras />
      <div className="pila">
        {primeraVez && (
          <div className="aviso aviso-dorado" style={{ fontSize: 14 }}>
            Forja da recomendaciones generales de alimentación basadas en fórmulas estándar. No reemplaza a un médico o nutricionista matriculado.
          </div>
        )}
        <Tarjeta className="pila">
          <Opciones nombre="Sexo" valor={sexo} onCambio={setSexo} opciones={[{ valor: 'hombre', nombre: 'Hombre' }, { valor: 'mujer', nombre: 'Mujer' }]} />
          <label className="campo">
            Fecha de nacimiento
            <input className="entrada" type="date" aria-label="Fecha de nacimiento" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="campo">
              Altura (cm)
              <input className="entrada" inputMode="numeric" aria-label="Altura (cm)" value={altura} onChange={(e) => setAltura(e.target.value)} />
            </label>
            <label className="campo">
              Peso (kg)
              <input className="entrada" inputMode="decimal" aria-label="Peso (kg)" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </label>
          </div>
        </Tarjeta>

        <Tarjeta className="pila">
          <Opciones
            nombre="Actividad"
            valor={actividad}
            onCambio={setActividad}
            opciones={ACTIVIDADES.map((a) => ({ valor: a.valor, nombre: a.nombre, detalle: a.ejemplo }))}
          />
        </Tarjeta>

        <Tarjeta className="pila">
          <Opciones nombre="Objetivo" valor={objetivo} onCambio={setObjetivo} opciones={OBJETIVOS} />
          <Opciones
            nombre="Comidas por día"
            valor={comidas}
            onCambio={setComidas}
            opciones={[{ valor: 3, nombre: '3' }, { valor: 4, nombre: '4' }, { valor: 5, nombre: '5' }]}
          />
        </Tarjeta>

        <Tarjeta className="pila">
          <div>
            <div className="texto-2" style={{ fontSize: 14, marginBottom: 6 }}>No como</div>
            <div className="chips" style={{ flexWrap: 'wrap' }}>
              {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  className="chip"
                  aria-pressed={grupos.includes(g)}
                  onClick={() => setGrupos(grupos.includes(g) ? grupos.filter((x) => x !== g) : [...grupos, g])}
                >
                  {GRUPOS[g]}
                </button>
              ))}
            </div>
          </div>
          <label className="campo">
            Otros ingredientes que no comés (separados por coma)
            <input className="entrada" aria-label="Otros ingredientes" placeholder="Ej.: cebolla, morrón" value={otros} onChange={(e) => setOtros(e.target.value)} />
          </label>
        </Tarjeta>

        {errores.length > 0 && (
          <div className="aviso" role="alert">
            {errores.map((e) => (
              <p key={e} className="error" style={{ margin: '2px 0' }}>{e}</p>
            ))}
          </div>
        )}
        <Boton ancho onClick={guardar}>Guardar mi plan</Boton>
      </div>
    </>
  );
}
