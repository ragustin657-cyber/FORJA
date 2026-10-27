import { useState } from 'react';
import { MEDIDAS, ultimasMedidas, validarMedidas, type NombreMedida } from '../../../core/cuerpo/medidas';
import { numero } from '../../../core/formato';
import { fechaLocal } from '../../../core/nutricion/registro';
import { cuerpoRepo } from '../../../data/repos/cuerpo';
import { Boton } from '../../componentes/Boton';
import { Encabezado } from '../../componentes/Encabezado';
import { Tarjeta } from '../../componentes/Tarjeta';
import { useCarga } from '../../datos';
import { navegar } from '../../router';

export function CargarMedidas() {
  const hoy = fechaLocal(new Date());
  const { datos: ultimas } = useCarga(async () => ultimasMedidas(await cuerpoRepo.medidas()));
  const [fecha, setFecha] = useState(hoy);
  const [textos, setTextos] = useState<Partial<Record<NombreMedida, string>>>({});
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const { valores, errores: problemas } = validarMedidas(textos);
    if (!fecha || fecha > hoy) problemas.push('Elegí una fecha de hoy o anterior.');
    setErrores(problemas);
    if (problemas.length) return;
    setGuardando(true);
    try {
      await cuerpoRepo.guardarMedidas(fecha, valores, Date.now());
      navegar('/progreso');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Cargar medidas" atras />
      <div className="pila">
        <Tarjeta className="pila">
          <label className="campo">
            Fecha
            <input className="entrada" type="date" aria-label="Fecha" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <p className="texto-2" style={{ margin: 0, fontSize: 14 }}>Medí con cinta métrica, sobre la piel y sin apretar. Completá las que quieras.</p>
        </Tarjeta>
        <Tarjeta className="pila">
          {MEDIDAS.map((m) => (
            <label key={m.id} className="campo">
              {m.nombre} (cm)
              <input
                className="entrada"
                inputMode="decimal"
                aria-label={`${m.nombre} (cm)`}
                placeholder={ultimas?.[m.id] ? `antes: ${numero(ultimas[m.id]!.valor)}` : ''}
                value={textos[m.id] ?? ''}
                onChange={(e) => setTextos({ ...textos, [m.id]: e.target.value })}
              />
              <span style={{ fontSize: 12 }}>{m.ayuda}</span>
            </label>
          ))}
        </Tarjeta>
        {errores.map((e) => (
          <p key={e} className="error" style={{ margin: 0 }}>{e}</p>
        ))}
        <Boton ancho onClick={guardar} disabled={guardando}>Guardar medidas</Boton>
      </div>
    </>
  );
}
