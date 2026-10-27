import { useState } from 'react';
import { proponerAjuste, type Propuesta } from '../../../core/nutricion/ajuste';
import { nutricionRepo } from '../../../data/repos/nutricion';
import { Boton } from '../../componentes/Boton';
import { Encabezado } from '../../componentes/Encabezado';
import { Tarjeta } from '../../componentes/Tarjeta';
import { useCarga } from '../../datos';
import { cargarNutricion, generarMenu, miles } from '../../nutricion';
import { Enlace, navegar } from '../../router';
import { MenuDeHoy } from './MenuDeHoy';

function Macro({ nombre, valor }: { nombre: string; valor: number }) {
  return (
    <div>
      <div className="texto-2" style={{ fontSize: 13 }}>{nombre}</div>
      <strong className="numeros" style={{ fontSize: 20 }}>{miles(valor)} g</strong>
    </div>
  );
}

/** Revisa el ajuste quincenal. Si se revisó y no hace falta ajustar, guarda la fecha del chequeo sin mostrar nada. */
async function revisarAjuste(): Promise<Propuesta | null> {
  const perfil = await nutricionRepo.perfil();
  if (!perfil) return null;
  const ahora = Date.now();
  const r = proponerAjuste(perfil, await nutricionRepo.pesos(), ahora);
  if (r === 'sin-cambios') {
    await nutricionRepo.guardarAjuste(perfil.ajusteKcal ?? 0, ahora);
    return null;
  }
  return r;
}

function TarjetaAjuste({ propuesta, alTerminar }: { propuesta: Propuesta; alTerminar: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const responder = async (aplicar: boolean) => {
    setOcupado(true);
    try {
      const perfil = await nutricionRepo.perfil();
      await nutricionRepo.guardarAjuste(aplicar ? propuesta.ajusteNuevo : (perfil?.ajusteKcal ?? 0), Date.now());
      alTerminar();
    } finally {
      setOcupado(false);
    }
  };
  return (
    <section aria-label="Revisamos tu progreso" className="aviso aviso-dorado pila">
      <span>
        <strong>Revisamos tu progreso:</strong> {propuesta.motivo}.
      </span>
      <span>
        Te proponemos 150 kcal {propuesta.delta < 0 ? 'menos' : 'más'} por día (de {miles(propuesta.kcalAntes)} a {miles(propuesta.kcalDespues)}).
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Boton variante="dorado" disabled={ocupado} onClick={() => responder(true)}>Aplicar</Boton>
        <Boton variante="secundario" disabled={ocupado} onClick={() => responder(false)}>Ahora no</Boton>
      </div>
    </section>
  );
}

export function Nutricion() {
  const { datos, recargar } = useCarga(cargarNutricion);
  const { datos: propuesta, recargar: recargarAjuste } = useCarga(revisarAjuste);
  const [rehaciendo, setRehaciendo] = useState(false);

  if (datos === undefined) {
    return (
      <>
        <Encabezado titulo="Nutrición" />
        <Tarjeta className="pila">
          <h2 style={{ fontSize: 20 }}>Tu plan de alimentación</h2>
          <p className="texto-2" style={{ margin: 0 }}>
            Con tu peso, altura y objetivo calculamos tus calorías y te armamos el menú de la semana con platos y lista de compras.
          </p>
          <Boton ancho onClick={() => navegar('/nutricion/plan')}>Armá tu plan</Boton>
        </Tarjeta>
      </>
    );
  }

  const { metas, perfil, peso, semana, desactualizado } = datos;

  return (
    <>
      <Encabezado titulo="Nutrición" accion={<Enlace a="/nutricion/plan" className="chip">Mi plan</Enlace>} />
      <div className="pila">
        {propuesta && (
          <TarjetaAjuste
            propuesta={propuesta}
            alTerminar={() => {
              recargarAjuste();
              recargar();
            }}
          />
        )}

        {desactualizado && (
          <div className="aviso aviso-dorado pila">
            <span><strong>Tu plan cambió.</strong> El menú de esta semana se armó con tus datos anteriores.</span>
            <Boton
              variante="dorado"
              disabled={rehaciendo}
              onClick={async () => {
                setRehaciendo(true);
                await generarMenu(perfil, peso, semana);
                setRehaciendo(false);
                recargar();
              }}
            >
              Rehacer el menú
            </Boton>
          </div>
        )}

        <section className="tarjeta pila" aria-label="Tus números">
          <span className="subtitulo" style={{ margin: 0 }}>Tus números</span>
          <div className="fila" style={{ alignItems: 'baseline', gap: 8 }}>
            <strong className="numeros" style={{ fontSize: 40, color: 'var(--color-dorado)', lineHeight: 1 }}>{miles(metas.kcal)}</strong>
            <span className="texto-2">kcal por día</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <Macro nombre="Proteína" valor={metas.proteina} />
            <Macro nombre="Grasas" valor={metas.grasas} />
            <Macro nombre="Carbohidratos" valor={metas.carbos} />
          </div>
          <div className="texto-2" style={{ fontSize: 14 }}>
            {metas.explicacion.map((l) => (
              <p key={l} style={{ margin: '2px 0' }}>{l}</p>
            ))}
          </div>
          {metas.alerta && <div className="aviso" role="alert" style={{ fontSize: 14 }}>{metas.alerta}</div>}
          <p className="texto-2" style={{ fontSize: 12, margin: 0 }}>Son valores aproximados y recomendaciones generales.</p>
        </section>

        <Enlace a="/nutricion/hoy" className="boton boton-primario boton-ancho">Registrar lo que comí</Enlace>

        <MenuDeHoy estado={datos} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Enlace a="/nutricion/semana" className="boton boton-secundario">Semana completa</Enlace>
          <Enlace a="/nutricion/compras" className="boton boton-secundario">Lista de compras</Enlace>
        </div>
      </div>
    </>
  );
}
