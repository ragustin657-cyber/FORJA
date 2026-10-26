import { fechaRelativa } from '../../core/formato';
import { descripcionRecord, recordsRecientes } from '../../core/records';
import { proximoDia } from '../../core/rutina';
import { necesitaCopia } from '../../core/recordatorios';
import { ajustesRepo } from '../../data/repos/ajustes';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { rutinasRepo } from '../../data/repos/rutinas';
import { sesionesRepo } from '../../data/repos/sesiones';
import { empezarDia } from '../acciones';
import { AvisoInstalar } from '../componentes/AvisoInstalar';
import { Boton } from '../componentes/Boton';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';
import { Enlace, navegar } from '../router';

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
