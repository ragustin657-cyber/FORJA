# FORJA Planes de 12 semanas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Armar planes de 12 semanas (objetivo, días, equipo, inicio) que generan una rutina editable, con progresión por bloques y descarga, que mandan en Inicio y tienen una tarjeta de calendario en Entrenar.

**Architecture:**
- La generación y las semanas son lógica pura en `src/core/planes.ts`, con los candidatos en `src/contenido/patrones.json` (armado por `scripts/patrones.mjs`, que valida contra la biblioteca).
- Los datos van en la tabla `planes` (IndexedDB v6).
- El ajuste semanal se aplica en `empezarDia` (`src/ui/acciones.ts`).
- Pantallas: `PlanNuevo`, tarjeta en `Entrenar`, `Inicio` y aviso en `Sesion`.

**Tech Stack:** el de siempre.

**Spec:** `docs/superpowers/specs/2026-10-27-forja-planes-design.md`

## Global Constraints

- Textos en rioplatense. Cobertura del 100 % en `src/core` y `src/data` (salvo `idb.ts`).
- Las plantillas, los parámetros por objetivo y la tabla de semanas se copian tal cual de las secciones 3.2, 3.3 y 4 del spec.
- 12 semanas, en bloques de 4; las descargas son las semanas 4, 8 y 12. La descarga usa `max(1, round(base × 0,6))` series y la sugerencia × 0,9, redondeada con `redondearPeso(·, incrementoKg)`.
- `inicio` es un lunes en `AAAA-MM-DD`, y la semana se calcula en fechas locales (usar `lunesDe` de `core/nutricion/semana.ts`).
- Candidatos solo traducidos y con el equipo correcto (gimnasio: cualquiera; mancuernas: dumbbell, body only y bands; casa: body only y bands).

## Review Focus

1. **Editar la rutina del plan** (sacar todos los ejercicios de un día, o agregar uno nuevo sin `basico`). El ajuste semanal no rompe: los ejercicios sin `basico` cuentan como accesorios, y un día vacío se saltea como siempre → prueba en la Task 2.
2. **Sesión en curso cuando cambia la semana** (empezada el domingo 23:50). Las series quedan como se crearon; la semana se calcula con `sesion.inicio` → prueba en la Task 6.
3. **Borrar la rutina del plan desde el editor.** El plan activo apunta a una rutina inexistente: Inicio y Entrenar no rompen y el plan se trata como cortado → prueba en la Task 5.
4. **Peso sugerido en descarga con sugerencia nula** (primera vez). Queda null; no aparece "0 kg" ni NaN → prueba en la Task 2.
5. **Restaurar una copia sin la tabla `planes`.** Sin plan activo, sin errores → prueba en la Task 3.

---

### Task 1: Patrones de ejercicios

**Files:** Create `scripts/patrones.mjs` (lista curada de ids por patrón y equipo; valida y escribe `src/contenido/patrones.json`; falla si un id no existe, no está traducido o no encaja con el equipo), `src/contenido/patrones.json`. Test: `tests/unit/core/patrones.test.ts`.

**Interfaces — Produces:** `type Patron = 'sentadilla' | 'bisagra' | 'empuje-horizontal' | 'empuje-vertical' | 'tiron-horizontal' | 'tiron-vertical' | 'unilateral' | 'femoral' | 'cuadriceps' | 'gemelos' | 'pecho-aislado' | 'hombro-lateral' | 'hombro-posterior' | 'biceps' | 'triceps' | 'core'`; `type Equipo = 'gimnasio' | 'mancuernas' | 'casa'`; JSON `Record<Patron, Record<Equipo, string[]>>`.

- [ ] **Step 1: Test que falla:**
  - Cada id de `patrones.json` existe en `ejercicios.json`, con `traducido: true`, y su `equipo` encaja con la lista de equipos (Global Constraints).
  - Los 16 patrones tienen al menos 2 candidatos en gimnasio y al menos 1 en mancuernas.
  - En casa tienen candidatos al menos: sentadilla, bisagra, empuje-horizontal, tiron-horizontal o tiron-vertical, unilateral y core.
- [ ] **Step 2:** FAIL → armar la lista con `node -e` sobre la biblioteca (nombres en español), correr el script → PASS. Commit.

### Task 2: Generación del plan y semanas

**Files:** Create `src/core/planes.ts`. Modify `src/data/tipos.ts` (`EjercicioEnDia.basico?: boolean`). Test: `tests/unit/core/planes.test.ts`.

**Interfaces — Consumes:** `Patron` y `Equipo` (Task 1), `Nivel` (core/proyeccion), `Rutina`/`DiaRutina`/`EjercicioEnDia` (data/tipos, solo tipos). **Produces:**
```ts
type ObjetivoPlan = 'fuerza' | 'musculo' | 'grasa' | 'general'; const OBJETIVOS: { id: ObjetivoPlan; nombre: string }[]   // Fuerza / Ganar músculo / Bajar grasa / Forma general
type EntradaPlan = { objetivo: ObjetivoPlan; dias: 3 | 4 | 5 | 6; equipo: Equipo; nivel: Nivel }
PLANTILLAS: Record<string, string[]>; DIAS_POR_SEMANA: Record<3|4|5|6, string[]>   // de la sección 3.2 del spec
generarRutina(e: EntradaPlan, patrones: Record<Patron, Record<Equipo, string[]>>, id: () => string, ahora: number): Rutina
semanaDelPlan(inicio: string /*AAAA-MM-DD*/, ahora: Date): { estado: 'por-empezar' | 'activo' | 'terminado'; semana: number; bloque: number; semanaBloque: 1|2|3|4; descarga: boolean }
seriesDeSemana(e: EjercicioEnDia, semanaBloque: 1|2|3|4): number
diaDeSemana(dia: DiaRutina, semanaBloque: 1|2|3|4): DiaRutina          // aplica seriesDeSemana a cada ejercicio
pesoDeDescarga(peso: number | null, incremento: number): number | null
inicioDelPlan(opcion: 'este' | 'proximo', ahora: Date): string           // lunes
sesionesDeLaSemana(sesiones: { rutinaId: string; inicio: number; fin: number | null }[], rutinaId: string, ahora: Date): number
```

- [ ] **Step 1: Tests que fallan** (con un `patrones` chico de prueba, salvo donde se indica):
  - `generarRutina`:
    - 4 días → días ['Torso A', 'Piernas A', 'Torso B', 'Piernas B']; 3 → Cuerpo A/B/C; 5 y 6 según el spec.
    - Nombre "Plan de ganar músculo · 4 días", con `origen: 'plan'`.
    - Fuerza: básicos con 5 series, 3–6 repeticiones y 180 s; accesorios con 4, 6–10 y 120 s. Músculo, grasa y general según la tabla 3.3. Los 2 primeros llevan `basico: true`.
    - Variante `:1` → segundo candidato; con un solo candidato, el último; sin candidatos, el hueco se saltea; un ejercicio repetido en el día toma el siguiente no usado.
    - Principiante: 5 ejercicios en lugar de 6.
    - Con el `patrones.json` real: casa de 3 días → cada día con 3 o más ejercicios y sin repetidos.
  - `semanaDelPlan('2026-10-26', …)`:
    - domingo 25/10 → por-empezar;
    - lunes 26/10 a las 00:00 → semana 1;
    - domingo 1/11 a las 23:59 → semana 1;
    - lunes 2/11 → 2;
    - 16/11 → semana 4, descarga;
    - 18/1/2027 → semana 13, terminado.
  - `seriesDeSemana` con base 4 y básico: 3, 4, 5 y 2 para las semanas 1 a 4. Accesorio con base 3: 2, 3, 3 y 2. Base 2 en semana 1 → 2 (mínimo). Base 1 en descarga → 1. Sin `basico` → accesorio (Review Focus 1).
  - `diaDeSemana` con un día vacío → día vacío.
  - `pesoDeDescarga(100, 2.5)` → 90; `(52.5, 2.5)` → 47,5; `(null, 2.5)` → null (Review Focus 4).
  - `inicioDelPlan`: miércoles 28/10 → 'este' = '2026-10-26' y 'proximo' = '2026-11-02'.
  - `sesionesDeLaSemana` solo cuenta las terminadas de esa rutina, de lunes a domingo.
- [ ] **Step 2:** FAIL → implementar → PASS (`npm run coverage`). Commit.

### Task 3: Datos: planes (v6)

**Files:** Modify `src/data/db.ts` (`planes`), `src/data/idb.ts` (VERSION_BASE = 6), `tests/e2e/migracion.test.mjs` (las versiones esperadas pasan a 6, más un caso v5 → v6). Create `src/data/repos/planes.ts`. Test: `tests/unit/data/planes.test.ts`.

**Interfaces — Produces:**
```ts
interface Plan { id: string; rutinaId: string; objetivo: ObjetivoPlan; dias: 3|4|5|6; equipo: Equipo; inicio: string; creado: number; estado: 'activo' | 'terminado' | 'cortado' }
planesRepo = {
  activo(): Promise<Plan | undefined>;                   // activo y con su rutina existente (si la rutina no está, lo marca 'cortado' y devuelve undefined)
  crear(p: Plan, rutina: Rutina): Promise<void>;           // guarda la rutina, corta el activo anterior y guarda el plan
  cambiarEstado(id: string, estado: Plan['estado']): Promise<void>;
}
```

- [ ] **Step 1: Tests que fallan:**
  - Crear deja activo el nuevo y corta el anterior; las dos rutinas siguen existiendo.
  - `activo()` con su rutina borrada → undefined y estado 'cortado' (Review Focus 3).
  - La copia de seguridad incluye los planes.
  - Restaurar una copia sin `planes` → `activo()` undefined (Review Focus 5).
  - En e2e, migración v5 → v6.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 4: Pantalla "Armar un plan"

**Files:** Create `src/ui/pantallas/PlanNuevo.tsx` (ruta `/entrenar/plan/nuevo`). Modify `src/App.tsx`, `src/ui/pantallas/Entrenar.tsx` (botón "Armar un plan"). Test: `tests/e2e/planes.test.mjs`.

- Hay radiogroups "Objetivo", "Días por semana", "Equipo" e "Inicio", el texto del nivel con un enlace "Cambiar" a `/mas/ajustes`, y el botón "Crear plan". Al crearlo, se navega a `/entrenar`.
- Si hay un plan activo, aparece el `Dialogo` "Ya tenés un plan activo. ¿Reemplazarlo?" con "Reemplazar".

- [ ] **Step 1: Tests e2e que fallan:**
  - Armar Ganar músculo / 4 / Gimnasio / Este lunes → en Entrenar aparece la rutina "Plan de ganar músculo · 4 días".
  - Armar otro → aparece el diálogo; con "Reemplazar" queda el nuevo como activo (se verifica en la Task 5 por la tarjeta).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 5: Tarjeta del plan en Entrenar, Inicio y final

**Files:** Modify `Entrenar.tsx` (tarjeta `aria-label="Tu plan"`), `Inicio.tsx`. Create `src/ui/plan.ts` (`cargarPlan(): Promise<{ plan; rutina; semana: ReturnType<typeof semanaDelPlan>; estaSemana: number } | null>`). Test: `tests/e2e/planes.test.mjs`, con un helper que mueve `inicio` en IndexedDB.

- **Tira de 12 casillas:** `role="list"`; cada casilla es un `listitem` con `aria-label` "Semana N", más ", descarga" y ", actual" cuando corresponde. Muestra "D" en las descargas.
- **Textos:**
  - "Esta semana: X de N entrenamientos";
  - en Inicio, "Semana 3 de 12 · Bloque 1" y la marca "Descarga";
  - "Tu plan arranca el lunes D/M";
  - la tarjeta final de la sección 5 del spec.

- [ ] **Step 1: Tests e2e que fallan:**
  - Después de crear el plan: la tarjeta "Tu plan" muestra 12 casillas, la Semana 1 actual y "Esta semana: 0 de 4 entrenamientos". Inicio muestra "Próximo: Torso A" y "Semana 1 de 12 · Bloque 1".
  - Con una rutina propia y otra del plan, Inicio muestra la del plan.
  - Con el inicio 3 semanas atrás → Inicio muestra "Descarga".
  - Con el inicio 13 semanas atrás → "¡Terminaste tu plan de 12 semanas! 🏆"; "Volver a mis rutinas" hace que Inicio vuelva a mostrar la rutina propia.
  - "Terminar plan" con confirmación → la tarjeta desaparece.
  - Con "El lunes que viene" → "Tu plan arranca el lunes …".
  - Borrar la rutina del plan desde el editor → Entrenar e Inicio sin errores y sin tarjeta (Review Focus 3).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 6: Ajuste semanal en la sesión

**Files:** Modify `src/ui/acciones.ts` (`crearSiNoHay`: si `rutina.id` es la del plan activo y está 'activo', usa `diaDeSemana(dia, semanaBloque)` y, en descarga, `pesoDeDescarga` sobre cada sugerencia), `src/ui/pantallas/Sesion.tsx` (aviso con `role="note"`, calculado con `semanaDelPlan(plan.inicio, new Date(sesion.inicio))` si la sesión es de la rutina del plan). Test: `tests/e2e/planes.test.mjs`.

- [ ] **Step 1: Tests e2e que fallan:**
  - Semana 1 → la sesión del primer ejercicio básico tiene 3 series (base 4 − 1) y el aviso dice "Semana 1 de 12 · Bloque 1".
  - Semana 4 (inicio 3 semanas atrás) con una sesión previa del primer ejercicio a 100 kg × 12 en todas las series → aviso "Semana de descarga: más liviano a propósito, para recuperarte", 2 series y peso sugerido 92,5. La sugerencia normal sería 102,5 (sube), y × 0,9 = 92,25 → 92,5.
  - Una rutina propia no muestra el aviso y conserva sus series.
  - Con la sesión empezada el domingo 23:50 y el reloj ya en lunes (`page.clock`), el aviso sigue diciendo la semana del inicio (Review Focus 2).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 7: Verificación, revisión y publicación

- [ ] `npm run verificar` → todo verde. Capturas de PlanNuevo, Entrenar con la tarjeta, Inicio y Sesión en descarga.
- [ ] Revisión final independiente, con la sección Review Focus.
- [ ] Arreglos con TDD.
- [ ] Merge, push y deploy.
