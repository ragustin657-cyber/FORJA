# FORJA Fase 1 — Base, Biblioteca y Entrenamiento: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una PWA instalable en iPhone donde Agustín arma rutinas a mano con ejercicios de una biblioteca con imágenes, registra sesiones en el gimnasio sin internet, recibe sugerencias de progresión y ve su fuerza estimada y récords, con copia de seguridad.

**Architecture:** React + TypeScript con Vite, como PWA offline. La lógica pura vive en `src/core/` y está 100 % probada. Los datos se guardan en IndexedDB vía Dexie, y las pantallas solo acceden a ellos a través de `src/data/repos/`. La biblioteca de ejercicios es contenido estático generado por un script e incluido en el build.

**Tech Stack:** Node 20+, Vite 5, React 18, TypeScript (strict), react-router-dom (HashRouter), Dexie 4, vite-plugin-pwa, Recharts, JSZip, Vitest + @testing-library/react + jsdom + fake-indexeddb, sharp (solo en el script de importación).

**Spec:** `docs/superpowers/specs/2026-10-26-forja-design.md` (secciones 5, 6, 7.1, 7.3, 7.7, 8, 10, 11, 12). Fuera de esta fase: proyección (7.1, último bloque), planes (7.2), nutrición (7.4), progreso corporal (7.5), inicio completo (7.6) e IA (9).

## Global Constraints

- Textos de la interfaz en español rioplatense ("vos", "tocá", "empezá").
- Nombre: "FORJA" en logo y encabezados; "Forja" en textos corridos.
- Colores (tokens CSS, sin otros colores sueltos): fondo `#141012`, tarjeta `#1E181A`, bordó `#7A1F2B`, bordó claro `#A8323F`, dorado `#C9A227`, texto `#F3ECE8`, texto secundario `#A69B97`.
- Botones con alto mínimo de 48 px; la app respeta `env(safe-area-inset-*)`.
- Todo funciona sin internet una vez instalada (service worker precachea la app y las imágenes de ejercicios).
- Las pantallas nunca importan `src/data/db.ts`; solo usan `src/data/repos/*`.
- Pesos en kg; incremento por defecto 2,5 kg (configurable en Ajustes).
- Progresión: +2,5 kg tren superior, +5 kg tren inferior; −10 % tras dos caídas seguidas.
- 1RM con Epley `peso × (1 + reps / 30)`, solo para series de 1 a 15 repeticiones.
- `src/core/` con cobertura 100 % (`vitest --coverage` con umbral para esa carpeta).
- Mensajes de commit en español, terminando con las líneas de atribución de la sesión.

## Review Focus

1. **Sesión interrumpida:** si se bloquea el iPhone, se cambia de app o iOS recarga la página a mitad de la sesión, al volver tiene que aparecer la sesión en curso con todas las series ya cargadas → prueba en Task 9.
2. **Números con coma:** el teclado decimal de iOS en español escribe "62,5". Tiene que leerse como 62,5 kg; un peso de 0, negativo o vacío no se puede guardar → prueba en Task 3 (`parsearNumero`) y Task 9.
3. **Primer uso de un ejercicio:** sin historial no hay sugerencia de peso. La pantalla tiene que mostrar el peso vacío con el texto "primera vez: elegí un peso cómodo", sin fallar → prueba en Task 4 y Task 9.
4. **Copia de seguridad inválida:** un archivo corrupto, de otra app o con versión de formato mayor a la soportada tiene que dar un error claro **sin borrar** los datos actuales → prueba en Task 6.
5. **Borrar un ejercicio o rutina con historial:** el historial y los récords se conservan. Ejercicios y rutinas se archivan (`archivado: true`) en lugar de borrarse → prueba en Task 5.

---

## Estructura de archivos

```
forja/
  package.json, vite.config.ts, tsconfig.json, index.html
  public/icons/                     ← íconos PWA (192, 512, apple-touch 180)
  public/ejercicios/<id>/0.webp, 1.webp   ← generadas por el script
  scripts/importar-ejercicios.ts    ← descarga y procesa free-exercise-db
  src/
    main.tsx, App.tsx               ← router y barra inferior
    core/
      unidades.ts                   ← redondearPeso, parsearNumero
      progresion.ts                 ← e1rm, mejorSerie, sugerirSiguiente
      records.ts                    ← detectarRecords
      biblioteca.ts                 ← tipoDeEjercicio, filtrarEjercicios
      sesion.ts                     ← reducer de sesión en curso
    data/
      tipos.ts                      ← interfaces de entidades
      db.ts                         ← Dexie, esquema v1
      repos/ejercicios.ts, rutinas.ts, sesiones.ts, ajustes.ts
      backup.ts                     ← exportar, leerResumen, restaurar
      persistencia.ts               ← pedirPersistencia, estaInstalada
    contenido/
      ejercicios.json               ← generado por el script
      traducciones-es.json          ← nombres e instrucciones en español
    ui/
      tema/tokens.css, base.css
      componentes/Boton.tsx, Tarjeta.tsx, Stepper.tsx, AvisoInstalar.tsx
      pantallas/Inicio.tsx, Entrenar.tsx, Rutinas.tsx, EditorRutina.tsx,
               Sesion.tsx, ProgresoEjercicio.tsx, Progreso.tsx,
               Nutricion.tsx, Mas.tsx, Biblioteca.tsx, DetalleEjercicio.tsx,
               Ajustes.tsx, Backup.tsx
  tests/                            ← espeja src/ (core/, data/, ui/)
```

---

### Task 1: Proyecto base y PWA instalable

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `public/icons/*`, `vitest.setup.ts`
- Test: `tests/ui/App.test.tsx`

**Interfaces:**
- Produces: `npm run dev`, `npm test`, `npm run build`, `npm run coverage`; componente `App` por defecto.

- [ ] **Step 1:** Crear el proyecto con `npm create vite@latest . -- --template react-ts`, instalar las dependencias del Tech Stack y configurar Vitest (environment `jsdom`, setup con `@testing-library/jest-dom` y `fake-indexeddb/auto`). Cobertura con umbral de 100 % en lines, branches y functions para `src/core/**`.
- [ ] **Step 2:** Configurar `vite-plugin-pwa` con `registerType: 'autoUpdate'`. El manifest lleva `name: "FORJA"`, `short_name: "FORJA"`, `lang: "es-AR"`, `display: "standalone"`, `theme_color: "#7A1F2B"` y `background_color: "#141012"`. Workbox precachea `**/*.{js,css,html,webp,png,svg}`. Usar `base: './'` para que funcione en GitHub Pages.
- [ ] **Step 3:** En `index.html`, agregar `viewport-fit=cover`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style="black-translucent"`, `apple-touch-icon` de 180 px y `<title>FORJA</title>`. Generar los íconos: "F" dorada sobre bordó, en SVG convertido a PNG.
- [ ] **Step 4: Test que falla:** `App muestra el logo FORJA` → `render(<App/>)`; `expect(screen.getByText('FORJA')).toBeInTheDocument()`.
- [ ] **Step 5:** `npm test` → FAIL. Implementar `App` mínimo con el encabezado. `npm test` → PASS. `npm run build` → sin errores, y `dist/manifest.webmanifest` existe.
- [ ] **Step 6:** Commit `feat: proyecto base FORJA como PWA`.

### Task 2: Tema bordó/dorado y navegación con 5 pestañas

**Files:**
- Create: `src/ui/tema/tokens.css`, `src/ui/tema/base.css`, `src/ui/componentes/Boton.tsx`, `Tarjeta.tsx`, `Stepper.tsx`, y `src/ui/pantallas/{Inicio,Entrenar,Nutricion,Progreso,Mas}.tsx` (placeholders salvo lo que llenen tareas posteriores)
- Modify: `src/App.tsx`
- Test: `tests/ui/navegacion.test.tsx`, `tests/ui/Stepper.test.tsx`

**Interfaces:**
- Produces:
  - `Boton({variante?: 'primario'|'secundario'|'dorado', ...props})`
  - `Tarjeta({children})`
  - `Stepper({valor: number|null, paso: number, min?: number, onCambio(v: number): void, etiqueta: string})`, con botones − y + e input `inputMode="decimal"`
  - Rutas (HashRouter): `/`, `/entrenar`, `/entrenar/rutina/:id`, `/entrenar/sesion`, `/nutricion`, `/progreso`, `/progreso/ejercicio/:id`, `/mas`, `/mas/biblioteca`, `/mas/biblioteca/:id`, `/mas/ajustes`, `/mas/backup`

- [ ] **Step 1: Tests que fallan:**
  - `muestra 5 pestañas` → los textos "Inicio", "Entrenar", "Nutrición", "Progreso" y "Más" están en `role="navigation"`.
  - `tocar Entrenar navega` → click en "Entrenar"; la pestaña queda con `aria-current="page"`.
  - `Stepper suma y resta el paso` → valor 60, paso 2,5, click en "+" → `onCambio(62.5)`; click en "−" → `onCambio(57.5)`; nunca baja de `min`.
- [ ] **Step 2:** Correr → FAIL. Implementar los tokens CSS (los colores de Global Constraints como `--color-*`, sin modo claro), la barra inferior fija con `padding-bottom: env(safe-area-inset-bottom)` y los componentes. La pestaña activa va en dorado. Tipografías: "Bebas Neue" para el logo y los títulos, e "Inter" para el texto y los números, auto-alojadas con `@fontsource` para que funcionen offline.
- [ ] **Step 3:** Correr → PASS. Commit `feat: tema bordó y dorado, navegación`.

### Task 3: Unidades — redondeo y lectura de números

**Files:**
- Create: `src/core/unidades.ts`
- Test: `tests/core/unidades.test.ts`

**Interfaces:**
- Produces:
  - `redondearPeso(kg: number, incremento = 2.5): number` → múltiplo más cercano del incremento
  - `parsearNumero(texto: string): number | null` → acepta coma o punto; devuelve `null` si está vacío o no es un número

- [ ] **Step 1: Tests que fallan:** `redondearPeso(61.2)` → `60`; `redondearPeso(61.3)` → `62.5`; `redondearPeso(23, 1)` → `23`; `parsearNumero('62,5')` → `62.5`; `parsearNumero('62.5')` → `62.5`; `parsearNumero(' 80 ')` → `80`; `parsearNumero('')` → `null`; `parsearNumero('abc')` → `null`.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: redondeo de pesos y lectura de números con coma`.

### Task 4: Progresión y 1RM estimado

**Files:**
- Create: `src/core/progresion.ts`
- Test: `tests/core/progresion.test.ts`

**Interfaces:**
- Consumes: `redondearPeso` (Task 3)
- Produces:
  ```ts
  type SerieHecha = { peso: number; reps: number; completada: boolean };
  type Objetivo = { series: number; repsMin: number; repsMax: number };
  type TipoEjercicio = 'superior' | 'inferior';
  type Sugerencia = { peso: number | null; motivo: 'subir' | 'mantener' | 'bajar' | 'primera-vez' };
  e1rm(peso: number, reps: number): number | null      // null si reps < 1 o > 15 o peso <= 0
  mejorSerie(series: SerieHecha[]): SerieHecha | null   // la de mayor e1rm entre las completadas
  sugerirSiguiente(historial: SerieHecha[][], objetivo: Objetivo, tipo: TipoEjercicio, incremento = 2.5): Sugerencia
  ```
  `historial` va de la sesión más vieja a la más nueva, solo con las series de ese ejercicio.

- [ ] **Step 1: Tests que fallan:**
  - `e1rm(100, 10)` → ≈ `133.33`; `e1rm(100, 1)` → ≈ `103.33`; `e1rm(100, 16)` → `null`; `e1rm(0, 5)` → `null`.
  - **Subir, superior:** la última sesión fue 3 × 12 a 60 kg, con objetivo 3 × 8–12 → `{peso: 62.5, motivo: 'subir'}`.
  - **Subir, inferior:** mismo caso con tipo `'inferior'` y 100 kg → `{peso: 105, motivo: 'subir'}`.
  - **Mantener:** la última fue 60 kg × 12, 11, 10 → `{peso: 60, motivo: 'mantener'}`.
  - **Mantener si faltan series:** se completaron solo 2 de 3 series a 12 → `'mantener'`.
  - **Bajar:** las mejores series de 3 sesiones dan un e1rm estrictamente decreciente (dos caídas seguidas), con último peso 80 → `{peso: 72.5, motivo: 'bajar'}`, porque 80 × 0,9 = 72 se redondea a 72,5.
  - **Primera vez:** historial `[]` → `{peso: null, motivo: 'primera-vez'}`.
- [ ] **Step 2:** FAIL → implementar → PASS. La regla "bajar" se evalúa antes que "subir". Commit `feat: doble progresión y 1RM estimado`.

### Task 5: Base de datos y repositorios

**Files:**
- Create: `src/data/tipos.ts`, `src/data/db.ts`, `src/data/repos/{ejercicios,rutinas,sesiones,ajustes}.ts`
- Test: `tests/data/repos.test.ts`

**Interfaces:**
- Consumes: tipos de Task 4.
- Produces (en `tipos.ts`):
  ```ts
  interface Ejercicio { id: string; nombre: string; nombreOriginal: string; musculos: string[];
    equipo: string; tipo: TipoEjercicio; imagenes: string[]; instrucciones: string[];
    favorito: boolean; propio: boolean; archivado: boolean }
  interface EjercicioEnDia { ejercicioId: string; series: number; repsMin: number; repsMax: number; descansoSeg: number }
  interface DiaRutina { id: string; nombre: string; ejercicios: EjercicioEnDia[] }
  interface Rutina { id: string; nombre: string; origen: 'manual' | 'plan'; dias: DiaRutina[]; archivado: boolean; creada: number }
  interface SerieRegistrada { ejercicioId: string; numero: number; peso: number; reps: number; completada: boolean }
  interface Sesion { id: string; rutinaId: string; diaId: string; inicio: number; fin: number | null; series: SerieRegistrada[] }
  interface Ajustes { incrementoKg: number; ultimaCopia: number | null }
  ```
  Esquema Dexie v1, con tablas `ejercicios` (`id, tipo, equipo, favorito`), `rutinas` (`id, archivado`), `sesiones` (`id, rutinaId, inicio, fin`) y `ajustes` (clave única `'app'`).
  Repos:
  - `ejerciciosRepo`: `todos()`, `porId(id)`, `guardar(e)`, `archivar(id)`, `alternarFavorito(id)`, `sembrarSiVacio(lista: Ejercicio[])`
  - `rutinasRepo`: `activas()`, `porId(id)`, `guardar(r)`, `archivar(id)`
  - `sesionesRepo`: `enCurso(): Promise<Sesion | undefined>` (la que tiene `fin === null`), `guardar(s)`, `finalizar(id, fin)`, `historialDeEjercicio(ejercicioId): Promise<SerieRegistrada[][]>` (sesiones finalizadas, de la más vieja a la más nueva), `ultimaDeDia(diaId)`
  - `ajustesRepo`: `obtener()` (con defaults `{incrementoKg: 2.5, ultimaCopia: null}`), `guardar(parcial)`

- [ ] **Step 1: Tests que fallan:**
  - `archivar ejercicio conserva el historial` → guardar el ejercicio y una sesión finalizada que lo usa, archivarlo; `historialDeEjercicio` sigue devolviendo esa sesión y `porId` lo devuelve con `archivado: true`, pero no aparece en `todos()`.
  - `archivar rutina la saca de activas()` → `porId` todavía la devuelve.
  - `historialDeEjercicio ordena por inicio y excluye sesiones en curso`.
  - `enCurso devuelve la sesión sin fin`.
  - `ajustes trae defaults si no hay nada guardado`.
- [ ] **Step 2:** FAIL → implementar → PASS. Los ids se generan con `crypto.randomUUID()`. Commit `feat: base de datos local y repositorios`.

### Task 6: Copia de seguridad

**Files:**
- Create: `src/data/backup.ts`, `src/ui/pantallas/Backup.tsx`
- Test: `tests/data/backup.test.ts`

**Interfaces:**
- Consumes: `db` (Task 5; único módulo fuera de repos que lo importa)
- Produces:
  ```ts
  const VERSION_FORMATO = 1;
  exportar(opciones: { incluirFotos: boolean }): Promise<Blob>    // zip con datos.json {version, fecha, tablas:{...}}
  leerResumen(archivo: Blob): Promise<{ fecha: number; sesiones: number; rutinas: number; fotos: number }>
  restaurar(archivo: Blob): Promise<void>   // reemplaza todas las tablas dentro de una transacción
  class ErrorBackup extends Error { motivo: 'corrupto' | 'version-nueva' | 'no-es-forja' }
  ```
  `exportar` recorre `db.tables` para que las tablas de fases futuras entren solas. En esta fase `incluirFotos` no tiene efecto, porque todavía no hay tabla de fotos.

- [ ] **Step 1: Tests que fallan:**
  - `exportar y restaurar es idéntico` → cargar ejercicios, rutinas y sesiones; exportar; vaciar la base; restaurar; el contenido de cada tabla es igual (`toEqual`).
  - `leerResumen cuenta sesiones y rutinas`.
  - `archivo corrupto no borra datos` → `restaurar(new Blob(['basura']))` rechaza con `ErrorBackup` de motivo `'corrupto'`, y los datos previos siguen intactos.
  - `versión mayor rechaza` → zip con `version: 2` → motivo `'version-nueva'`, sin cambios en la base.
  - `zip sin datos.json` → motivo `'no-es-forja'`.
- [ ] **Step 2:** FAIL → implementar con JSZip; toda la validación se hace **antes** de abrir la transacción. → PASS.
- [ ] **Step 3:** En la pantalla Backup, el botón "Exportar copia" usa `navigator.share({files:[new File([blob], 'forja-AAAA-MM-DD.zip')]})`, con descarga como alternativa si no está disponible, y guarda `ultimaCopia` en los ajustes. "Restaurar" pide el archivo, muestra el resumen y un aviso de que reemplaza los datos actuales, y confirma. Los errores se muestran en español: "El archivo está dañado", "Esta copia es de una versión más nueva de FORJA" y "Este archivo no es una copia de FORJA".
- [ ] **Step 4:** Commit `feat: copia de seguridad exportable y restaurable`.

### Task 7: Persistencia en iPhone y aviso de instalación

**Files:**
- Create: `src/data/persistencia.ts`, `src/ui/componentes/AvisoInstalar.tsx`
- Modify: `src/App.tsx`
- Test: `tests/data/persistencia.test.ts`, `tests/ui/AvisoInstalar.test.tsx`

**Interfaces:**
- Produces: `estaInstalada(): boolean` (`matchMedia('(display-mode: standalone)')` o `navigator.standalone`), `pedirPersistencia(): Promise<boolean>` (devuelve `false` si la API no existe).

- [ ] **Step 1: Tests que fallan:**
  - `pedirPersistencia devuelve false sin API`.
  - `pedirPersistencia llama a storage.persist` (con mock).
  - `AvisoInstalar se muestra si no está instalada` y contiene "Compartir" y "Agregar a inicio".
  - `AvisoInstalar no se muestra si está instalada`.
  - `AvisoInstalar se puede cerrar y no vuelve en 7 días` → guarda la fecha en `localStorage`, dentro de try/catch.
- [ ] **Step 2:** FAIL → implementar. Al arrancar, `App` llama a `pedirPersistencia()` si la app está instalada. → PASS. Commit `feat: persistencia y aviso de instalación en iPhone`.

### Task 8: Biblioteca de ejercicios

**Files:**
- Create: `scripts/importar-ejercicios.ts`, `src/core/biblioteca.ts`, `src/contenido/ejercicios.json` (generado), `src/contenido/traducciones-es.json`, `public/ejercicios/**` (generado), `src/ui/pantallas/Biblioteca.tsx`, `src/ui/pantallas/DetalleEjercicio.tsx`, `LICENCIAS.md`
- Test: `tests/core/biblioteca.test.ts`, `tests/ui/Biblioteca.test.tsx`

**Interfaces:**
- Consumes: `Ejercicio` y `ejerciciosRepo` (Task 5)
- Produces:
  ```ts
  tipoDeEjercicio(musculosPrimarios: string[]): TipoEjercicio
    // 'inferior' si alguno es quadriceps|hamstrings|glutes|calves|adductors|abductors; si no, 'superior'
  normalizar(texto: string): string    // minúsculas, sin tildes
  filtrarEjercicios(lista: Ejercicio[], f: { texto?: string; musculo?: string; equipo?: string; soloFavoritos?: boolean }): Ejercicio[]
    // la búsqueda compara normalizar() contra el nombre y el nombreOriginal; ordena favoritos primero y luego alfabético
  ```

- [ ] **Step 1: Verificar licencia.** Leer el LICENSE de `github.com/yuhonas/free-exercise-db`. Si es dominio público (Unlicense), registrarlo en `LICENCIAS.md`. Si no lo es, **frenar y avisar** a Agustín antes de seguir.
- [ ] **Step 2: Tests que fallan:**
  - `tipoDeEjercicio(['quadriceps'])` → `'inferior'`; `(['chest'])` → `'superior'`; `(['abdominals'])` → `'superior'`.
  - `filtrarEjercicios` con texto "press banca" encuentra "Press de banca" (sin importar tildes ni mayúsculas); con texto "bench" encuentra por `nombreOriginal`; filtra por músculo y equipo; con `soloFavoritos` deja solo esos; los archivados no aparecen.
- [ ] **Step 3:** FAIL → implementar `biblioteca.ts` → PASS.
- [ ] **Step 4:** Escribir el script, que se corre con `npx tsx scripts/importar-ejercicios.ts`. Descarga `dist/exercises.json` y las imágenes del repo, convierte cada imagen a WebP con ancho de 480 px y calidad 70 usando sharp, y guarda `public/ejercicios/<id>/<n>.webp`. Después mapea al tipo `Ejercicio`, aplica `traducciones-es.json` (por `id`: `{nombre, instrucciones[]}`) y escribe `src/contenido/ejercicios.json`. Al terminar imprime cuántos ejercicios hay, cuántos están traducidos y el peso total de las imágenes en MB.
- [ ] **Step 5:** Completar `traducciones-es.json` con los 150 ejercicios más comunes de gimnasio, con nombres como se dicen en Argentina (press de banca, sentadilla, peso muerto, remo con barra, dominadas, vuelos laterales, curl de bíceps, etc.). Cubrir todos los patrones de movimiento y equipos. Correr el script.
- [ ] **Step 6:** Pantallas. **Biblioteca:** buscador, chips de músculo y equipo, estrella de favorito y botón "Crear ejercicio propio" (nombre, músculo, equipo y tipo). **Detalle:** las dos imágenes, la lista de instrucciones y el botón de favorito. Al iniciar, `App` llama a `ejerciciosRepo.sembrarSiVacio()` con el JSON. Test de UI: `escribir en el buscador filtra la lista`.
- [ ] **Step 7:** `npm run build` → el precache incluye `/ejercicios/**`. Commit `feat: biblioteca de ejercicios con imágenes`.

### Task 9: Rutinas manuales y sesión en el gimnasio

**Files:**
- Create: `src/core/sesion.ts`, `src/ui/pantallas/Rutinas.tsx`, `EditorRutina.tsx`, `Sesion.tsx`
- Modify: `src/ui/pantallas/Entrenar.tsx`
- Test: `tests/core/sesion.test.ts`, `tests/ui/EditorRutina.test.tsx`, `tests/ui/Sesion.test.tsx`

**Interfaces:**
- Consumes: `sugerirSiguiente` (Task 4), `parsearNumero` (Task 3), los repos (Task 5), `Stepper` (Task 2)
- Produces:
  ```ts
  type Accion =
    | { tipo: 'cambiar'; ejercicioId: string; numero: number; campo: 'peso' | 'reps'; valor: number | null }
    | { tipo: 'completar'; ejercicioId: string; numero: number }
    | { tipo: 'descompletar'; ejercicioId: string; numero: number };
  crearSesion(rutina: Rutina, dia: DiaRutina, sugerencias: Record<string, Sugerencia>, ultima: Record<string, SerieRegistrada[]>, ahora: number): Sesion
    // una SerieRegistrada por serie objetivo; peso = sugerencia.peso; reps = reps de la misma serie de la última vez, o si no repsMax
  reducirSesion(s: Sesion, a: Accion): Sesion
    // 'completar' se ignora si peso es null o <= 0, o si reps es null o < 1
  ```

- [ ] **Step 1: Tests de core que fallan:**
  - `crearSesion precarga el peso sugerido y las reps de la última vez`.
  - `crearSesion con primera-vez deja el peso en null`.
  - `completar con peso 0 no marca la serie`.
  - `cambiar y completar actualiza solo esa serie`.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3: Editor de rutina.** Nombre de la rutina; agregar, renombrar y reordenar días; agregar ejercicios desde la biblioteca (reusa `filtrarEjercicios`); por ejercicio se definen series (default 3), rango de repeticiones (default 8–12) y descanso (default 90 s); también se pueden borrar ejercicios del día. "Eliminar rutina" la archiva. Test: `crear rutina con un día y dos ejercicios y guardarla` → `rutinasRepo.activas()` la devuelve.
- [ ] **Step 4: Pantalla de sesión.** Al entrar, si existe `sesionesRepo.enCurso()`, se retoma; si no, se crea con `crearSesion`. **Cada acción se guarda de inmediato** con `sesionesRepo.guardar`. Por ejercicio se muestra la imagen chica, el nombre, el texto "La vez pasada: 60 kg × 10, 10, 9" y la sugerencia (con chip dorado "¡Subí a 62,5 kg!", "Mantené 60 kg", "Bajá a 72,5 kg y reconstruí" o "Primera vez: elegí un peso cómodo"). Por serie, un `Stepper` de peso (paso = incremento de ajustes), otro de reps (paso 1) y un botón grande de completar. Al completar arranca el temporizador de descanso: cuenta regresiva visible, sonido corto con Web Audio y `navigator.vibrate` si existe (en iPhone no existe, así que queda solo el sonido y el aviso visual). Al final, el botón "Terminar entrenamiento" llama a `finalizar` y navega al resumen (Task 10).
- [ ] **Step 5: Tests de UI que fallan y luego pasan:**
  - `retoma la sesión en curso al volver a montar` → montar, completar una serie, desmontar, montar de nuevo; la serie sigue completada.
  - `peso con coma se guarda como número` → escribir "62,5" en el input → la serie guardada tiene `peso: 62.5`.
  - `primera vez muestra el mensaje y no falla`.
- [ ] **Step 6:** En Entrenar se ven las rutinas activas; tocar un día lo abre en la sesión, y si hay una sesión en curso aparece un banner "Tenés un entrenamiento en curso — Retomar". Commit `feat: rutinas manuales y sesión de entrenamiento`.

### Task 10: Récords, resumen de sesión y gráfico por ejercicio

**Files:**
- Create: `src/core/records.ts`, `src/ui/pantallas/ProgresoEjercicio.tsx`, `src/ui/componentes/ResumenSesion.tsx`
- Modify: `src/ui/pantallas/Progreso.tsx`, `src/ui/pantallas/Inicio.tsx`
- Test: `tests/core/records.test.ts`, `tests/ui/ProgresoEjercicio.test.tsx`

**Interfaces:**
- Consumes: `e1rm` y `mejorSerie` (Task 4), `sesionesRepo.historialDeEjercicio` (Task 5)
- Produces:
  ```ts
  type Records = { mejorE1rm: number | null; mayorPeso: number | null; repsPorPeso: Record<number, number> };
  calcularRecords(historial: SerieRegistrada[][]): Records      // solo cuenta series completadas
  detectarRecords(previos: Records, sesion: SerieRegistrada[]): Array<{ tipo: 'e1rm' | 'peso' | 'reps'; valor: number; peso?: number }>
  ```

- [ ] **Step 1: Tests que fallan:**
  - `calcularRecords` con 60 × 10 y 62,5 × 8 → `mayorPeso: 62.5`, y `mejorE1rm` es el máximo entre `e1rm(60, 10)` = 80 y `e1rm(62.5, 8)` ≈ 79,17, o sea 80. Además `repsPorPeso[60] = 10`.
  - `detectarRecords` marca `'peso'` cuando se supera el mayor peso; marca `'reps'` con un mismo peso y más repeticiones; con un historial vacío, la primera sesión no cuenta como récord (devuelve `[]`).
  - Las series no completadas se ignoran.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3:** **ResumenSesion:** duración, series totales y récords nuevos en dorado ("Nuevo récord: Press de banca 62,5 kg"). **ProgresoEjercicio:** gráfico de línea Recharts con el e1rm por sesión (línea dorada, sin grilla pesada, tooltip con fecha, e1rm y mejor serie) y una lista de récords; con menos de 2 sesiones muestra el mensaje "Necesitás al menos 2 sesiones para ver el gráfico". **Progreso:** lista de ejercicios con historial y su mejor e1rm. **Inicio (mínimo):** logo, el próximo día de la última rutina usada con botón "Empezar" y los últimos 3 récords. Test de UI: `con una sesión muestra el mensaje de mínimo`.
- [ ] **Step 4:** Commit `feat: récords, resumen y gráfico de fuerza`.

### Task 11: Ajustes, verificación final y publicación

**Files:**
- Create: `src/ui/pantallas/Ajustes.tsx`, `.github/workflows/deploy.yml`, `README.md`
- Modify: `src/ui/pantallas/Mas.tsx`

**Interfaces:**
- Consumes: `ajustesRepo` (Task 5)

- [ ] **Step 1:** **Ajustes:** incremento de peso (1, 1,25, 2 o 2,5 kg). **Más:** enlaces a Biblioteca, Ajustes y Copia de seguridad, más el aviso de salud de la sección 15 del spec. Recordatorio de copia: si `ultimaCopia` es null o tiene más de 30 días, Inicio muestra una tarjeta "Hacé tu copia de seguridad". Test: `muestra el recordatorio si pasaron 31 días`.
- [ ] **Step 2:** `npm run coverage` → `src/core` al 100 %; `npm test` → todo PASS; `npm run build` → sin errores ni warnings de TypeScript.
- [ ] **Step 3:** Workflow de GitHub Actions que construye y publica `dist/` en GitHub Pages con cada push a `main`. El README explica cómo instalar la app en el iPhone. **Requiere que Agustín cree el repositorio en su GitHub** (o autorice crearlo); sin eso, la tarea se cierra dejando el workflow listo y se le avisa.
- [ ] **Step 4: Prueba manual en iPhone** (la hace Agustín, con guía): abrir la URL en Safari, tocar Compartir y luego "Agregar a inicio", abrir la app, activar el modo avión y confirmar que abre, que se ve la biblioteca con imágenes y que se puede registrar una sesión; cerrar la app por completo, reabrirla y comprobar que los datos siguen; exportar una copia y guardarla en Archivos.
- [ ] **Step 5:** Commit `feat: ajustes, recordatorio de copia y publicación`.

---

## Autorrevisión

- **Cobertura del spec en esta fase:** 5.1 (T1, T2, T6, T8, T10), 5.2 (estructura), 5.3 (T7, T11), 6 en las entidades de esta fase (T5), 7.1 sin proyección (T4, T9, T10), 7.3 (T8), 7.7 (T2, T11), 8 (T1, T2), 10 (T6), 11 en sin internet, datos inválidos y sesión interrumpida (T3, T6, T9), 12 en core, backup y pantallas clave (T3–T10), y 15 (T11). Fuera de esta fase y con plan propio: proyección, planes, nutrición, registro de comidas, progreso corporal, inicio completo e IA.
- **Consistencia de tipos:** `SerieHecha` (core) es un subconjunto estructural de `SerieRegistrada` (data), así que `historialDeEjercicio` es compatible con `sugerirSiguiente` y `calcularRecords`.
