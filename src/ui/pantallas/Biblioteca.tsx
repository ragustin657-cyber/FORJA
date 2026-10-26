import { useState } from 'react';
import { EQUIPOS, MUSCULOS, tipoDeEjercicio } from '../../core/biblioteca';
import { nuevoId } from '../../data/db';
import { ejerciciosRepo } from '../../data/repos/ejercicios';
import { Boton } from '../componentes/Boton';
import { Encabezado } from '../componentes/Encabezado';
import { SelectorEjercicios } from '../componentes/SelectorEjercicios';
import { Tarjeta } from '../componentes/Tarjeta';
import { useCarga } from '../datos';
import { navegar } from '../router';

function NuevoEjercicio({ onListo }: { onListo: () => void }) {
  const [nombre, setNombre] = useState('');
  const [musculo, setMusculo] = useState('chest');
  const [equipo, setEquipo] = useState('barbell');
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (nombre.trim() === '') {
      setError('Poné un nombre para el ejercicio.');
      return;
    }
    await ejerciciosRepo.guardar({
      id: 'propio-' + nuevoId(),
      nombre: nombre.trim(),
      nombreOriginal: nombre.trim(),
      musculos: [musculo],
      equipo,
      tipo: tipoDeEjercicio([musculo]),
      imagenes: [],
      instrucciones: [],
      favorito: false,
      propio: true,
      archivado: false,
    });
    onListo();
  }

  return (
    <Tarjeta className="pila">
      <h2 style={{ fontSize: 18 }}>Nuevo ejercicio</h2>
      <label className="campo">
        Nombre
        <input className="entrada" aria-label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="campo">
        Músculo principal
        <select className="entrada" aria-label="Músculo principal" value={musculo} onChange={(e) => setMusculo(e.target.value)}>
          {Object.entries(MUSCULOS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label className="campo">
        Equipo
        <select className="entrada" aria-label="Equipo" value={equipo} onChange={(e) => setEquipo(e.target.value)}>
          {Object.entries(EQUIPOS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="fila">
        <Boton variante="secundario" onClick={onListo}>Cancelar</Boton>
        <Boton onClick={guardar}>Guardar ejercicio</Boton>
      </div>
    </Tarjeta>
  );
}

export function Biblioteca() {
  const { datos: ejercicios, recargar } = useCarga(() => ejerciciosRepo.todos());
  const [creando, setCreando] = useState(false);

  return (
    <>
      <Encabezado titulo="Ejercicios" atras />
      <div className="pila">
        {creando ? (
          <NuevoEjercicio
            onListo={() => {
              setCreando(false);
              recargar();
            }}
          />
        ) : (
          <Boton variante="secundario" ancho onClick={() => setCreando(true)}>Crear ejercicio propio</Boton>
        )}
        {ejercicios ? (
          <SelectorEjercicios ejercicios={ejercicios} onElegir={(e) => navegar('/mas/biblioteca/' + encodeURIComponent(e.id))} />
        ) : (
          <p className="vacio">Cargando…</p>
        )}
      </div>
    </>
  );
}
