import { useState } from 'react';
import patrones from '../../contenido/patrones.json';
import { diasPermitidos, EQUIPOS, generarRutina, inicioDelPlan, OBJETIVOS, type Equipo, type ObjetivoPlan, type Patrones } from '../../core/planes';
import { NIVELES } from '../../core/proyeccion';
import { nuevoId } from '../../data/db';
import { ajustesRepo } from '../../data/repos/ajustes';
import { planesRepo } from '../../data/repos/planes';
import { Boton } from '../componentes/Boton';
import { Dialogo } from '../componentes/Dialogo';
import { Encabezado } from '../componentes/Encabezado';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';
import { Enlace, navegar } from '../router';

type Opcion<T> = { id: T; nombre: string; detalle?: string; deshabilitada?: boolean };

function Grupo<T extends string | number>({ nombre, valor, opciones, onCambio }: { nombre: string; valor: T; opciones: Opcion<T>[]; onCambio: (v: T) => void }) {
  return (
    <fieldset className="pila" style={{ border: 'none', padding: 0, margin: 0, gap: 8 }}>
      <legend className="subtitulo" style={{ marginBottom: 8 }}>{nombre}</legend>
      <div role="radiogroup" aria-label={nombre} className="pila" style={{ gap: 8 }}>
        {opciones.map((o) => (
          <label key={o.id} className="opcion" aria-pressed={o.id === valor} style={{ opacity: o.deshabilitada ? 0.45 : 1 }}>
            <input
              type="radio"
              name={nombre}
              checked={o.id === valor}
              disabled={o.deshabilitada}
              onChange={() => onCambio(o.id)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              aria-label={o.detalle ? `${o.nombre}: ${o.detalle}` : String(o.nombre)}
            />
            <strong>{o.nombre}</strong>
            {o.detalle && <span className="texto-2" style={{ fontSize: 13 }}>{o.detalle}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PlanNuevo() {
  const { datos } = useCarga(async () => ({ nivel: (await ajustesRepo.obtener()).nivel, activo: await planesRepo.activo() }));
  const [objetivo, setObjetivo] = useState<ObjetivoPlan>('musculo');
  const [dias, setDias] = useState<3 | 4 | 5 | 6>(4);
  const [equipo, setEquipo] = useState<Equipo>('gimnasio');
  const [inicio, setInicio] = useState<'este' | 'proximo'>('este');
  const [confirmar, setConfirmar] = useState(false);
  const [creando, setCreando] = useState(false);
  if (!datos) return <Encabezado titulo="Armar un plan" atras />;

  const permitidos = diasPermitidos(equipo);
  const nivel = NIVELES.find((n) => n.id === datos.nivel)!;

  async function crear() {
    setConfirmar(false);
    setCreando(true);
    try {
      const ahora = new Date();
      const rutina = generarRutina({ objetivo, dias, equipo, nivel: datos!.nivel }, patrones as Patrones, nuevoId, ahora.getTime());
      await planesRepo.crear(
        { id: nuevoId(), rutinaId: rutina.id, objetivo, dias, equipo, inicio: inicioDelPlan(inicio, ahora), creado: ahora.getTime(), estado: 'activo' },
        rutina,
      );
      navegar('/entrenar');
    } finally {
      setCreando(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Armar un plan" atras />
      <div className="pila">
        <p className="texto-2" style={{ margin: 0 }}>
          Un plan de 12 semanas en 3 bloques. Cada 4 semanas hay una de descarga, más liviana, para recuperarte y seguir progresando.
        </p>
        <Tarjeta className="pila">
          <Grupo nombre="Objetivo" valor={objetivo} opciones={OBJETIVOS} onCambio={setObjetivo} />
        </Tarjeta>
        <Tarjeta className="pila">
          <Grupo
            nombre="Días por semana"
            valor={dias}
            opciones={([3, 4, 5, 6] as const).map((d) => ({ id: d, nombre: `${d} días`, deshabilitada: !permitidos.includes(d) }))}
            onCambio={setDias}
          />
          {equipo === 'casa' && <p className="texto-2" style={{ margin: 0, fontSize: 13 }}>En casa, hasta 4 días por semana.</p>}
        </Tarjeta>
        <Tarjeta className="pila">
          <Grupo
            nombre="Equipo"
            valor={equipo}
            opciones={EQUIPOS}
            onCambio={(e) => {
              setEquipo(e);
              const ok = diasPermitidos(e);
              if (!ok.includes(dias)) setDias(ok[ok.length - 1]);
            }}
          />
        </Tarjeta>
        <Tarjeta className="pila">
          <Grupo nombre="Inicio" valor={inicio} opciones={[{ id: 'este', nombre: 'Este lunes', detalle: 'La semana 1 es esta' }, { id: 'proximo', nombre: 'El lunes que viene' }]} onCambio={setInicio} />
        </Tarjeta>
        <div className="fila-entre texto-2" style={{ fontSize: 14 }}>
          <span>Nivel {nivel.nombre.toLowerCase()}</span>
          <Enlace a="/mas/ajustes" className="chip">Cambiar</Enlace>
        </div>
        <Boton ancho disabled={creando} onClick={() => (datos.activo ? setConfirmar(true) : crear())}>Crear plan</Boton>
      </div>
      {confirmar && (
        <Dialogo titulo="Ya tenés un plan activo. ¿Reemplazarlo?" confirmar="Reemplazar" onCancelar={() => setConfirmar(false)} onConfirmar={crear}>
          La rutina del plan anterior queda guardada en Entrenar.
        </Dialogo>
      )}
    </>
  );
}
