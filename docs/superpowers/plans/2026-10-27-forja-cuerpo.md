# FORJA Progreso corporal — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Medidas con gráfico y % de grasa estimado, fotos de progreso con cámara propia (foto fantasma y temporizador) o galería, comparación entre fechas, recordatorio en Inicio y fotos en la copia de seguridad.

**Architecture:**
- La lógica pura va en `src/core/cuerpo/`: `medidas.ts`, `grasa.ts`, `fotos.ts`.
- Los datos van en las tablas `medidas`, `fotos` e `imagenes` (IndexedDB v4) y se acceden por `src/data/repos/cuerpo.ts`.
- El procesamiento de imagen (canvas, JPEG y miniatura) va en `src/ui/imagen.ts`.
- Las pantallas van en `src/ui/pantallas/cuerpo/`.

**Tech Stack:** el de siempre (React, IndexedDB propio, esbuild, bun test, Playwright).

**Spec:** `docs/superpowers/specs/2026-10-27-forja-cuerpo-design.md`

## Global Constraints

- Textos en rioplatense; coma decimal en pantalla; se aceptan coma o punto al escribir.
- Cobertura del 100 % en `src/core` y `src/data` (salvo `idb.ts`). Las pantallas no importan `data/db`.
- **Medidas:**
  - cada medida entre 15 y 250 cm, y el cuello entre 20 y 70;
  - un registro por día, cuyo id es `AAAA-MM-DD` en hora local;
  - se combinan campo a campo.
- **% de grasa** (Marina de EE. UU., log10, cm):
  - fórmulas de la sección 4.1 del spec;
  - no se muestra si la cintura es ≤ al cuello o si el resultado queda fuera de 2–60 %;
  - se muestra con un decimal.
- **Fotos:**
  - id `AAAA-MM-DD-pose`, con las poses 'frente', 'perfil' y 'espalda';
  - JPEG de calidad 0,82, con el lado largo de 1600 px como máximo, y miniatura de 320 px;
  - foto fantasma al 35 % de opacidad;
  - temporizador de 0, 5 o 10 s;
  - cámara ideal de 1440×1920, que arranca con la trasera.
- **Recordatorio:** a los 14 días de la última foto, o si nunca se sacó una; "Ahora no" lo pospone 3 días.
- **Copia de seguridad:**
  - `VERSION_FORMATO` = 2, y se aceptan copias de la versión 1;
  - las fotos van en `fotos/<id>.jpg` y `fotos/<id>-mini.jpg`;
  - si la copia no trae fotos, se conservan las del iPhone.

## Review Focus

1. **Foto de la galería en vertical con EXIF rotado.** Se tiene que guardar derecha; se usa `createImageBitmap(archivo, { imageOrientation: 'from-image' })` → prueba en la Task 5, con un JPEG con orientación 6.
2. **Salir de la cámara a mitad de la cuenta regresiva.** No dispara después, y la cámara y el temporizador se apagan → prueba en la Task 6.
3. **Restaurar una copia de la versión 1, sin tablas de cuerpo.** No rompe, y las fotos actuales se conservan → prueba en la Task 3.
4. **Medida escrita "84,5" o con espacios, o todos los campos vacíos.** La primera se acepta y la segunda muestra "Completá al menos una medida" → prueba en la Task 1.
5. **Reemplazar una foto del mismo día y pose.** Pide confirmación y no deja una imagen huérfana → pruebas en la Task 2 (repo) y la Task 6 (UI).

---

### Task 1: Lógica de medidas y % de grasa

**Files:** Create `src/core/cuerpo/medidas.ts`, `src/core/cuerpo/grasa.ts`. Tests: `tests/unit/core/cuerpo/medidas.test.ts`, `grasa.test.ts`.

**Interfaces — Produces:**
```ts
type NombreMedida = 'cintura' | 'pecho' | 'brazo' | 'pierna' | 'cadera' | 'cuello';
const MEDIDAS: { id: NombreMedida; nombre: string; ayuda: string }[]   // en este orden; ayuda = textos de la sección 4 del spec
interface RegistroMedidas { id: string; fecha: number } & Partial<Record<NombreMedida, number>>
validarMedidas(textos: Partial<Record<NombreMedida, string>>): { valores: Partial<Record<NombreMedida, number>>; errores: string[] }
combinarMedidas(antes: RegistroMedidas | undefined, nuevo: RegistroMedidas): RegistroMedidas
ultimasMedidas(registros: RegistroMedidas[]): Partial<Record<NombreMedida, { valor: number; diferencia: number | null }>>
serieDeMedida(registros: RegistroMedidas[], m: NombreMedida): { fecha: number; valor: number }[]
grasaCorporal(sexo: 'hombre' | 'mujer', alturaCm: number, m: Partial<Record<NombreMedida, number>>): number | null
grasaActual(sexo, alturaCm, registros: RegistroMedidas[]): number | null      // último registro con las medidas necesarias
serieDeGrasa(sexo, alturaCm, registros): { fecha: number; valor: number }[]
```

- [ ] **Step 1: Tests que fallan:**
  - `validarMedidas`:
    - acepta "84,5" y " 84.5 " como 84,5;
    - todo vacío → `["Completá al menos una medida."]`;
    - cintura 300 → "La cintura tiene que estar entre 15 y 250 cm.";
    - cuello 80 → "El cuello tiene que estar entre 20 y 70 cm.";
    - "abc" → el mismo mensaje de rango.
  - `combinarMedidas`: lo nuevo pisa, lo vacío conserva lo anterior.
  - `ultimasMedidas`: la diferencia es contra el registro anterior que tenga esa medida; null si es la primera.
  - `serieDeMedida` ordena por fecha y omite los registros sin esa medida.
  - `grasaCorporal`:
    - hombre con 180 cm, cintura 85 y cuello 38 → 16,9 (con 1 decimal);
    - mujer con 165 cm, cintura 75, cadera 100 y cuello 33 → 31,0 (verificar con la fórmula en la prueba);
    - cintura ≤ cuello → null;
    - mujer sin cadera → null;
    - resultado > 60 → null.
  - `grasaActual` saltea el último registro si no tiene cuello.
- [ ] **Step 2:** FAIL → implementar → PASS (`npm run coverage`). Commit.

### Task 2: Lógica de fotos, base v4 y repositorio

**Files:** Create `src/core/cuerpo/fotos.ts`, `src/data/repos/cuerpo.ts`. Modify `src/data/db.ts` (agregar `medidas`, `fotos`, `imagenes` a TABLAS), `src/data/idb.ts` (VERSION_BASE = 4), `src/data/tipos.ts` (Ajustes suma `temporizadorFoto: 0 | 5 | 10` con default 0 y `fotosPospuestas: number | null` con default null). Tests: `tests/unit/core/cuerpo/fotos.test.ts`, `tests/unit/data/cuerpo.test.ts`, y el caso v3→v4 en `tests/e2e/migracion.test.mjs`.

**Interfaces — Produces:**
```ts
type Pose = 'frente' | 'perfil' | 'espalda'; const POSES: { id: Pose; nombre: string }[]
interface Foto { id: string; fecha: string; pose: Pose; creado: number }
interface Imagen { id: string; imagen: Blob; miniatura: Blob }
idFoto(fecha: string, pose: Pose): string
necesitaFotos(ultimaFoto: string | undefined /*AAAA-MM-DD*/, pospuestas: number | null, ahora: number): boolean
fotosPorFecha(fotos: Foto[]): { fecha: string; poses: Partial<Record<Pose, Foto>> }[]     // más nueva primero
paresParaComparar(fotos: Foto[], pose: Pose): { antes: string; despues: string } | null   // primera y última fecha con esa pose
posesFaltantes(fotos: Foto[], fecha: string): Pose[]   // en orden de POSES
medidasEscaladas(ancho: number, alto: number, max: number): { ancho: number; alto: number }   // no agranda

cuerpoRepo = {
  medidas(): Promise<RegistroMedidas[]>; guardarMedidas(fecha: string /*AAAA-MM-DD*/, valores, ahora: number): Promise<void>; borrarMedidas(id: string): Promise<void>;
  fotos(): Promise<Foto[]>; foto(id): Promise<Foto | undefined>; imagen(id): Promise<Imagen | undefined>;
  guardarFoto(f: Foto, img: Imagen): Promise<void>;   // reemplaza si existe
  borrarFoto(id: string): Promise<void>;              // borra la foto y su imagen
}
```

- [ ] **Step 1: Tests que fallan:**
  - Unitarios de `fotos.ts`:
    - `necesitaFotos`:
      - nunca hubo foto → true;
      - 13 días → false;
      - 14 días → true;
      - pospuesta hace 2 días → false;
      - pospuesta hace 3 días → true.
    - `fotosPorFecha` agrupa y ordena.
    - `paresParaComparar` devuelve null con una sola fecha.
    - `medidasEscaladas`:
      - (3024, 4032, 1600) → (1200, 1600);
      - (800, 600, 1600) → (800, 600).
  - Repositorio:
    - guardar medidas dos veces el mismo día combina;
    - guardar foto + imagen, reemplazar la misma id (queda una sola de cada), y borrar quita las dos;
    - Ajustes con valores por defecto.
  - En e2e, la migración v3 → v4 conserva el perfil, los registros y las rutinas.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 3: Copia de seguridad con fotos

**Files:** Modify `src/data/backup.ts`, `src/ui/pantallas/Backup.tsx` (pregunta "¿Incluir fotos?" con el tamaño aproximado, y resumen con fotos). Tests: `tests/unit/data/backup.test.ts`, `tests/e2e/backup.test.mjs`.

**Interfaces — Produces:** `exportar({ incluirFotos })` (ya existe); `leerResumen(archivo) → { …, fotos: number }`; `tamanoFotos(): Promise<number>` (bytes, en backup.ts).

- `datos.json` nunca lleva `imagenes`, y lleva `fotos` solo si `incluirFotos`.
- Las imágenes se guardan como `fotos/<id>.jpg` y `fotos/<id>-mini.jpg`.
- Al restaurar:
  - si la copia trae la tabla `fotos`, se reemplazan las fotos y se descartan las fotos sin imagen;
  - si no la trae, se pasan a `reemplazarTodo` las `fotos` e `imagenes` actuales.

- [ ] **Step 1: Tests que fallan:**
  - Ida y vuelta con fotos: las imágenes vuelven con los mismos bytes.
  - Sin fotos: el zip no tiene `fotos/` y `leerResumen().fotos` es 0.
  - Restaurar una copia sin fotos conserva las fotos actuales.
  - Restaurar una copia de la versión 1, armada a mano con `version: 1` y solo `sesiones`, funciona y conserva las fotos (Review Focus 3).
  - Una foto sin su jpg en el zip se descarta.
  - Una versión 3 → `version-nueva`.
  - E2E: "Exportar" con fotos muestra la pregunta.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 4: Medidas en Progreso

**Files:** Create `src/ui/pantallas/cuerpo/Medidas.tsx` (tarjeta), `CargarMedidas.tsx` (formulario, ruta `/progreso/medidas`). Modify `src/ui/pantallas/Progreso.tsx` (sección "Cuerpo": la tarjeta de peso existente, Medidas y Fotos, esta última como marcador hasta la Task 7), `src/ui/App.tsx` (rutas). Test: `tests/e2e/cuerpo.test.mjs`.

- La tarjeta tiene `aria-label="Medidas"`:
  - una fila por medida, con el formato "Cintura 84 cm · −1,5";
  - "% de grasa estimado: 16,1 %", con el aviso de la sección 4.1;
  - sin plan, muestra "Armá tu plan para estimar tu % de grasa";
  - chips de medida y "% grasa" con `GraficoLinea`, o "Cargá al menos dos registros para ver el gráfico";
  - el detalle permite borrar un registro, con confirmación.
- El formulario tiene fecha (`input type=date`, máximo hoy), seis campos con la ayuda y el placeholder "antes: 84", y los errores de `validarMedidas`.

- [ ] **Step 1: Tests e2e que fallan:**
  - Con el plan cargado (hombre, 180 cm), cargar cintura 85 y cuello 38 → aparece "16,1 %".
  - Cargar otro registro con cintura 83,5 en la fecha de ayer y hoy → "Cintura 83,5 cm · −1,5", y el gráfico de cintura es visible.
  - Todo vacío → "Completá al menos una medida."
  - Sin plan → aparece el mensaje "Armá tu plan…".
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 5: Procesamiento de imagen y galería

**Files:** Create `src/ui/imagen.ts`. Test: `tests/e2e/imagen.test.mjs` (en el navegador, porque usa canvas).

**Interfaces — Produces:**
```ts
procesarImagen(fuente: ImageBitmap | HTMLVideoElement | HTMLCanvasElement, opciones?: { espejar?: boolean }): Promise<{ imagen: Blob; miniatura: Blob; ancho: number; alto: number }>
desdeArchivo(archivo: Blob): Promise<ImageBitmap>   // createImageBitmap(archivo, { imageOrientation: 'from-image' })
```

- Usa `medidasEscaladas` para 1600 y 320, y `canvas.toBlob(…, 'image/jpeg', 0.82)`.

- [ ] **Step 1: Tests e2e que fallan**, con un módulo de prueba cargado en la página:
  - Un JPEG de 3000×4000 queda en 1200×1600 y la miniatura en 240×320.
  - Un JPEG de 400×300 con EXIF orientación 6, generado en la prueba, queda vertical (alto > ancho) (Review Focus 1).
  - `espejar` invierte (el píxel de la izquierda pasa a la derecha).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 6: Pantalla de cámara

**Files:** Create `src/ui/pantallas/cuerpo/Camara.tsx` (ruta `/progreso/fotos/nueva`), `src/ui/componentes/Silueta.tsx`. Test: `tests/e2e/fotos.test.mjs` (cámara simulada con un video Y4M; ver `tests/e2e/codigo.test.mjs:140-150`).

**Comportamiento** (sección 5.1 del spec):
- **Pose:** chips (`role="radiogroup"`, `aria-label="Pose"`).
- **Botones:** "Cambiar cámara", "Ocultar guía" / "Mostrar guía", y "Sacar foto" (con `aria-label`, fijo abajo).
- **Temporizador:** chips 0/5/10 (`aria-label="Temporizador"`), que se recuerdan en Ajustes.
- **Cuenta regresiva:** número grande con `role="timer"` y un pitido de `sonido.ts` por segundo. Tocar cancela.
- **Vista previa:** con "Usar foto" / "Repetir".
- **Fecha:** campo de fecha.
- **Galería:** "Elegir de la galería".
- **Reemplazo:** se pregunta con `confirm()` de la app, no del navegador: un diálogo propio con "Reemplazar" / "Cancelar".
- **Sin cámara:** aviso y galería.
- **Apagado de la cámara:** al desmontar y en `visibilitychange` (oculta → apaga; visible → reactiva).
- **Primera foto:** al guardarla se llama `navigator.storage?.persist?.()`.
- **Error al guardar:** "No se pudo guardar la foto. Liberá espacio en el iPhone".

- [ ] **Step 1: Tests e2e que fallan:**
  - Con la cámara simulada, "Sacar foto" → "Usar foto" guarda Frente, y la pose pasa sola a Perfil.
  - La guía muestra la foto anterior de Frente cuando se vuelve a elegir Frente (un `img` con `aria-label="Foto anterior"`).
  - Temporizador 5 con `page.clock`: a los 4 s todavía no hay vista previa; a los 5 s, sí.
  - Al salir (botón atrás) a mitad de la cuenta, no se guarda nada y todos los tracks quedan `ended` (Review Focus 2).
  - Al sacar otra vez Frente el mismo día, aparece "¿Reemplazarla?"; con "Reemplazar" queda una sola foto (Review Focus 5).
  - "Elegir de la galería" con `setInputFiles` de un JPEG guarda la foto en la fecha elegida.
  - Sin permiso de cámara (contexto sin flags y con el permiso denegado) aparece el aviso y la galería sigue disponible.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 7: Grilla, detalle, comparar y recordatorio

**Files:** Create `src/ui/pantallas/cuerpo/Fotos.tsx` (tarjeta de la grilla), `DiaFotos.tsx` (ruta `/progreso/fotos/:fecha`), `Comparar.tsx` (ruta `/progreso/comparar`). Modify `Progreso.tsx` (reemplazar el marcador), `Inicio.tsx` (tarjeta "Fotos de progreso"). Las imágenes se muestran con `URL.createObjectURL`, que se revoca al desmontar. Test: `tests/e2e/fotos.test.mjs` (con las fotos cargadas por la galería).

- [ ] **Step 1: Tests e2e que fallan:**
  - Grilla: dos fechas, la más nueva primero, y un recuadro vacío para la pose que falta.
  - Detalle: borrar una foto (con confirmación) la quita de la grilla.
  - Comparar:
    - por defecto, la primera y la última fecha;
    - lado a lado muestra las dos fechas y "· 80 kg" si hay peso ese día;
    - el modo "Deslizador" tiene un `role="slider"` que mueve el divisor;
    - si falta la pose, "No hay foto de perfil del …".
  - "Comparar" está deshabilitado con una sola fecha.
  - Inicio:
    - sin fotos, aparece la tarjeta "Fotos de progreso" con "Sacá tus primeras fotos";
    - "Ahora no" la oculta, también al recargar;
    - después de una foto de hoy, no aparece.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 8: Verificación, revisión y publicación

- [ ] `npm run verificar` → todo verde.
- [ ] Revisión final independiente, con la sección Review Focus.
- [ ] Arreglos con TDD.
- [ ] Merge a main y push.
- [ ] Esperar el deploy de Pages.
