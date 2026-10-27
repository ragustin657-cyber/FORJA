import { useState } from 'react';
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

export function Nutricion() {
  const { datos, recargar } = useCarga(cargarNutricion);
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
