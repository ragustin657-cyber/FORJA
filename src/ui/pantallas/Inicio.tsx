import { useState } from 'react';
import { fechaRelativa } from '../../core/formato';
import { calcularMetas } from '../../core/nutricion/calorias';
import { necesitaPesarse } from '../../core/nutricion/peso';
import { necesitaFotos } from '../../core/cuerpo/fotos';
import { cuerpoRepo } from '../../data/repos/cuerpo';
import { totales } from '../../core/nutricion/registro';
import { parsearNumero } from '../../core/unidades';
import { descripcionRecord, recordsRecientes } from '../../core/records';
import { proximoDia } from '../../core/rutina';
import { necesitaCopia } from '../../core/recordatorios';
import { ajustesRepo } from '../../data/repos/ajustes';
import { nutricionRepo } from '../../data/repos/nutricion';
import { registroRepo } from '../../data/repos/registro';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { rutinasRepo } from '../../data/repos/rutinas';
import { sesionesRepo } from '../../data/repos/sesiones';
import { empezarDia } from '../acciones';
import { Anillos } from '../componentes/Anillos';
import { AvisoInstalar } from '../componentes/AvisoInstalar';
import { Boton } from '../componentes/Boton';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';
import { fechaDeHoy } from '../registro';
import { Enlace, navegar } from '../router';

/** Calorías y proteína de hoy contra la meta, y si toca pesarse. Undefined si no hay plan. */
async function cargarNutricionHoy() {
  const perfil = await nutricionRepo.perfil();
  const pesos = await nutricionRepo.pesos();
  const ultimo = pesos[pesos.length - 1];
  if (!perfil || !ultimo) return undefined;
  const ahora = Date.now();
  const metas = calcularMetas(perfil, ultimo.kg, new Date(ahora));
  const total = totales(await registroRepo.delDia(fechaDeHoy()));
  return { metas, total, pesarse: necesitaPesarse(ultimo.fecha, ahora) };
}

async function cargarRecordatorioFotos() {
  const [fotos, ajustes] = await Promise.all([cuerpoRepo.fotos(), ajustesRepo.obtener()]);
  const ultima = fotos.map((f) => f.fecha).sort().pop();
  return necesitaFotos(ultima, ajustes.fotosPospuestas, Date.now()) ? { primeras: ultima === undefined } : null;
}

function RecordatorioFotos({ primeras, alPosponer }: { primeras: boolean; alPosponer: () => void }) {
  return (
    <section aria-label="Fotos de progreso" className="tarjeta pila">
      <h2 style={{ fontSize: 20, margin: 0 }}>Fotos de progreso</h2>
      <p className="texto-2" style={{ margin: 0 }}>
        {primeras ? 'Sacá tus primeras fotos para ver tu cambio.' : 'Pasaron 2 semanas desde tus últimas fotos. Sacá las de hoy y anotá tus medidas.'}
      </p>
      <Enlace a="/progreso/fotos/nueva" className="boton boton-primario boton-ancho">Sacar fotos</Enlace>
      <div className="fila-entre">
        <Enlace a="/progreso/medidas" className="chip">Medidas</Enlace>
        <button
          type="button"
          className="chip"
          onClick={async () => {
            await ajustesRepo.guardar({ fotosPospuestas: Date.now() });
            alPosponer();
          }}
        >
          Ahora no
        </button>
      </div>
    </section>
  );
}

function TocaPesarte({ alGuardar }: { alGuardar: () => void }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  return (
    <section aria-label="Toca pesarte" className="tarjeta pila">
      <h2 style={{ fontSize: 20, margin: 0 }}>Toca pesarte</h2>
      <p className="texto-2" style={{ margin: 0 }}>Pasó una semana desde tu último peso. Pesate en ayunas y cargalo para seguir tu progreso.</p>
      <div className="fila" style={{ gap: 8, alignItems: 'flex-end' }}>
        <label className="campo" style={{ flex: 1 }}>
          Peso (kg)
          <input className="entrada" inputMode="decimal" aria-label="Peso (kg)" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <Boton
          disabled={guardando}
          onClick={async () => {
            const kg = parsearNumero(texto);
            if (kg === null || kg < 35 || kg > 250) {
              setError('El peso tiene que estar entre 35 y 250 kg.');
              return;
            }
            setGuardando(true);
            try {
              await nutricionRepo.registrarPeso(kg, Date.now());
              alGuardar();
            } finally {
              setGuardando(false);
            }
          }}
        >
          Guardar
        </Boton>
      </div>
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </section>
  );
}

async function cargar() {
  const [rutinas, finalizadas, enCurso] = await Promise.all([rutinasRepo.activas(), sesionesRepo.finalizadas(), sesionesRepo.enCurso()]);
  const ultima = finalizadas[0];
  const rutina = rutinas.find((r) => r.id === ultima?.rutinaId) ?? rutinas[0];
  const dia = rutina && proximoDia(rutina, ultima?.rutinaId === rutina.id ? ultima.diaId : null);
  const recientes = recordsRecientes([...finalizadas].reverse(), 3);
  const nombres = Object.fromEntries(
    await Promise.all(recientes.map(async (r) => [r.ejercicioId, (await ejerciciosRepo.porId(r.ejercicioId))?.nombre ?? 'Ejercicio'] as const)),
  );
  const copia = necesitaCopia((await ajustesRepo.obtener()).ultimaCopia, finalizadas.length > 0, Date.now());
  return { rutina, dia, enCurso, recientes, nombres, ultima, copia };
}

export function Inicio() {
  const { datos } = useCarga(cargar);
  const { datos: nutri, recargar: recargarNutri } = useCarga(cargarNutricionHoy);
  const { datos: fotos, recargar: recargarFotos } = useCarga(cargarRecordatorioFotos);

  return (
    <>
      <header className="encabezado">
        <h1 className="logo">FORJA</h1>
      </header>
      <AvisoInstalar />
      {datos && (
        <div className="pila">
          {datos.enCurso ? (
            <Tarjeta className="pila" style={{ borderColor: 'rgba(201,162,39,0.45)' }}>
              <span className="subtitulo" style={{ margin: 0 }}>Entrenamiento en curso</span>
              <Boton variante="dorado" ancho onClick={() => navegar('/entrenar/sesion')}>Retomar</Boton>
            </Tarjeta>
          ) : datos.rutina && datos.dia ? (
            <Tarjeta className="pila">
              <span className="subtitulo" style={{ margin: 0 }}>Hoy toca</span>
              <div>
                <h2 className="titulo" style={{ fontSize: 24 }}>Próximo: {datos.dia.nombre}</h2>
                <p className="texto-2" style={{ margin: '4px 0 0' }}>
                  {datos.rutina.nombre} · {datos.dia.ejercicios.length} ejercicios
                  {datos.ultima && ` · último entrenamiento ${fechaRelativa(datos.ultima.inicio)}`}
                </p>
              </div>
              <Boton
                ancho
                disabled={datos.dia.ejercicios.length === 0}
                onClick={async () => {
                  await empezarDia(datos.rutina!, datos.dia!);
                  navegar('/entrenar/sesion');
                }}
              >
                Empezar
              </Boton>
            </Tarjeta>
          ) : (
            <Tarjeta className="pila">
              <h2 style={{ fontSize: 20 }}>¡Bienvenido a FORJA!</h2>
              <p className="texto-2" style={{ margin: 0 }}>Empezá armando tu rutina con los ejercicios que hacés en el gimnasio.</p>
              <Boton ancho onClick={() => navegar('/entrenar/rutina/nueva')}>Armar mi rutina</Boton>
            </Tarjeta>
          )}

          {nutri && (
            <Enlace a="/nutricion/hoy" className="tarjeta pila" aria-label="Lo que comiste hoy" style={{ gap: 10 }}>
              <span className="subtitulo" style={{ margin: 0 }}>Lo que comiste hoy</span>
              <Anillos kcal={nutri.total.kcal} metaKcal={nutri.metas.kcal} proteina={nutri.total.proteina} metaProteina={nutri.metas.proteina} />
            </Enlace>
          )}

          {nutri?.pesarse && <TocaPesarte alGuardar={recargarNutri} />}

          {fotos && <RecordatorioFotos primeras={fotos.primeras} alPosponer={recargarFotos} />}

          {datos.copia && (
            <div className="aviso fila-entre">
              <span>
                <strong>Hacé tu copia de seguridad</strong>
                <br />
                <span className="texto-2" style={{ fontSize: 14 }}>Tus datos viven solo en este iPhone.</span>
              </span>
              <Enlace a="/mas/backup" className="boton boton-secundario">Hacer copia</Enlace>
            </div>
          )}

          {datos.recientes.length > 0 && (
            <>
              <h2 className="subtitulo">Últimos récords</h2>
              <Tarjeta className="pila">
                {datos.recientes.map((r) => (
                  <div key={r.fecha + r.ejercicioId} className="fila-entre">
                    <span style={{ color: 'var(--color-dorado)' }}>🏆 {descripcionRecord(datos.nombres[r.ejercicioId], r.record)}</span>
                    <span className="texto-2" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fechaRelativa(r.fecha)}</span>
                  </div>
                ))}
              </Tarjeta>
            </>
          )}
        </div>
      )}
    </>
  );
}
