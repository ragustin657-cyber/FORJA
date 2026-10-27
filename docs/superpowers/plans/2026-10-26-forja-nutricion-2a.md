# FORJA Nutrición 2A — Tu plan y menú semanal: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Agustín cargue su perfil, vea sus calorías y macros, reciba un menú semanal de platos argentinos con porciones en gramos, pueda cambiar platos y use una lista de compras con casillas.

**Architecture:** La lógica pura va en `src/core/nutricion/` (sin pantallas, 100 % probada). El contenido es estático, con alimentos y platos en `src/contenido/`. Las tablas nuevas de IndexedDB se acceden solo por `src/data/repos/nutricion.ts`. Las pantallas van en `src/ui/pantallas/nutricion/`.

**Tech Stack:** el mismo de la fase 1: esbuild, React 19, bun test con cobertura y Playwright vía node:test. No hay acceso a npm, así que no se agregan dependencias.

**Spec:** `docs/superpowers/specs/2026-10-26-forja-nutricion-2a-design.md` (y la sección 7.4 de `docs/superpowers/specs/2026-10-26-forja-design.md`).

## Global Constraints

- Textos en español rioplatense; números con coma decimal y miles con punto ("2.650 kcal").
- Mifflin-St Jeor:
  - hombres: `10·peso + 6,25·altura − 5·edad + 5`
  - mujeres: `… − 161`
- Factores de actividad: 1,2 / 1,375 / 1,55 / 1,725 / 1,9.
- Ajuste por objetivo: bajar −20 %, mantener 0 %, ganar +10 %.
- Tope de calorías: `max(basal, 1500 hombres | 1200 mujeres)`. Tope de pérdida: el déficit diario no puede superar `peso × 0,01 × 7700 / 7` kcal (1 % del peso por semana).
- Macros:
  - proteína 2 g/kg (1,8 g/kg para mantener);
  - grasas 25 % de las kcal, con un mínimo de 0,6 g/kg;
  - carbohidratos = resto ÷ 4 (proteína y carbohidratos aportan 4 kcal/g, grasas 9 kcal/g).
- Redondeos: kcal a la decena; gramos de macros al entero; porciones de ingredientes a 5 g (a 1 g si son menos de 20 g).
- Rangos del perfil: altura 120–230 cm, peso 35–250 kg, edad 14–90 años.
- Reparto de calorías por cantidad de comidas: el de la sección 5 del spec, sin cambios.
- Factor de porción: entre 0,5 y 2,5. Objetivo del día: ±5 % de las kcal. Un mismo plato no se repite más de 2 veces por semana.
- Las pantallas no importan `data/db` ni `data/idb`.
- Cobertura de 100 % en `src/core/**` y `src/data/**` (salvo `idb.ts`).
- Commits con autor `Claude <noreply@anthropic.com>` y las líneas de atribución de la sesión.

## Review Focus

1. **"No como" deja una comida sin platos.** Si se excluyen varios grupos, por ejemplo lácteos, huevo y gluten, puede no quedar ningún plato para el desayuno. El menú no tiene que romperse: deja esa comida vacía con el aviso "No encontramos platos para el desayuno con lo que no comés", y el resto del día igual se arma → prueba en la Task 4.
2. **Calorías muy bajas o muy altas.** Con una persona chica que quiere bajar, o una grande muy activa, el factor de porción puede chocar con 0,5 o 2,5 y no llegar a ±5 %. Se acepta el mejor resultado posible y se muestra la diferencia real, nunca un error → prueba en la Task 4.
3. **Cambio de perfil con menú ya armado.** Al cambiar el peso o el objetivo, el menú guardado queda desactualizado. Inicio y Nutrición muestran "Tu plan cambió — ¿rehacer el menú?", y las casillas de la lista de compras se conservan → prueba en la Task 7.
4. **Fecha de nacimiento futura o edad fuera de rango.** El guardado se bloquea con un mensaje claro → prueba en la Task 2.
5. **Semana nueva.** Al empezar otra semana (lunes) se arma un menú nuevo sin perder el anterior, y la lista de compras usa la semana actual → prueba en la Task 6.

---

## Archivos

```
src/core/nutricion/
  tipos.ts        ← Alimento, Plato, Perfil, Objetivo, ComidaMenu, DiaMenu
  calorias.ts     ← edad, metabolismoBasal, calcularObjetivo
  perfil.ts       ← validarPerfil
  platos.ts       ← macrosDePlato, platoExcluido, redondearGramos
  azar.ts         ← generador con semilla (mulberry32)
  menu.ts         ← REPARTOS, armarMenu, alternativas, totalesDia
  compras.ts      ← listaCompras
  semana.ts       ← lunesDe(fecha) → 'AAAA-MM-DD'
src/contenido/alimentos.json, platos.json
src/data/repos/nutricion.ts
src/ui/pantallas/nutricion/Nutricion.tsx, MiPlan.tsx, Semana.tsx, Plato.tsx, Compras.tsx
tests/unit/core/nutricion/*.test.ts, tests/unit/contenido/nutricion.test.ts, tests/unit/data/nutricion.test.ts
tests/e2e/nutricion.test.mjs
```

### Task 1: Tipos y contenido (alimentos y platos)

**Files:** Create `src/core/nutricion/tipos.ts`, `src/contenido/alimentos.json`, `src/contenido/platos.json`. Test: `tests/unit/contenido/nutricion.test.ts`.

**Interfaces — Produces:**
```ts
type Categoria = 'verduleria' | 'carniceria' | 'almacen' | 'lacteos' | 'panaderia' | 'otros';
type Grupo = 'vacuna' | 'cerdo' | 'pollo' | 'pescado' | 'lacteos' | 'huevo' | 'gluten';
interface Alimento { id: string; nombre: string; kcal: number; proteina: number; grasas: number; carbos: number; // cada 100 g
  categoria: Categoria; grupos: Grupo[]; unidad?: { nombre: string; plural: string; gramos: number } }
type TipoComida = 'desayuno' | 'colacion' | 'almuerzo' | 'merienda' | 'cena';
interface Plato { id: string; nombre: string; tipos: TipoComida[]; ingredientes: { alimentoId: string; gramos: number }[]; pasos: string[] }
```
Los grupos de un plato se deducen de sus alimentos y no se cargan a mano.

- [ ] **Step 1: Tests de integridad que fallan:**
  - ~120 alimentos, con valores de referencia estándar.
  - ~70 platos, con estos mínimos por tipo: desayuno ≥ 12, merienda ≥ 12 (pueden compartirse), colación ≥ 8, almuerzo ≥ 20, cena ≥ 20 (pueden compartirse).
  - Cada ingrediente referencia un alimento existente.
  - Los ids son únicos.
  - Cada plato tiene entre 2 y 4 pasos y al menos un tipo de comida.
  - Las kcal de cada alimento coinciden con `4·P + 4·C + 9·G` dentro de ±15 %, para atrapar errores de carga.
  - Para cada grupo excluido por sí solo, quedan al menos 3 platos por tipo de comida.
- [ ] **Step 2:** FAIL → escribir el contenido → PASS. Commit `feat: alimentos y platos de la base de nutrición`.

### Task 2: Calorías, macros y validación del perfil

**Files:** Create `src/core/nutricion/calorias.ts`, `perfil.ts`. Test: `tests/unit/core/nutricion/calorias.test.ts`, `perfil.test.ts`.

**Interfaces — Produces:**
```ts
type Sexo = 'hombre' | 'mujer'; type Actividad = 'sedentario' | 'liviano' | 'moderado' | 'alto' | 'muyAlto';
type ObjetivoNutri = 'bajar' | 'mantener' | 'ganar';
interface Perfil { id: 'yo'; sexo: Sexo; nacimiento: string /* AAAA-MM-DD */; alturaCm: number; actividad: Actividad;
  objetivo: ObjetivoNutri; comidas: 3 | 4 | 5; noComoGrupos: Grupo[]; noComoTexto: string[] }
interface Metas { kcal: number; proteina: number; grasas: number; carbos: number; basal: number; gasto: number; topeAplicado: boolean; explicacion: string[] }
edad(nacimiento: string, hoy: Date): number
metabolismoBasal(sexo: Sexo, pesoKg: number, alturaCm: number, edad: number): number
calcularMetas(perfil: Perfil, pesoKg: number, hoy: Date): Metas
validarPerfil(p: Partial<Perfil> & { pesoKg?: number }, hoy: Date): string[]   // mensajes; [] = válido
```

- [ ] **Step 1: Tests que fallan:**
  - Hombre de 80 kg, 180 cm y 30 años: basal 1.780, gasto con "moderado" 2.759.
  - Bajar → 2.207,2 → se redondea a 2.210.
  - Proteína 160 g; grasas 61 g (25 % de 2.210 / 9 = 61,4 > 0,6·80 = 48); carbohidratos `(2210 − 640 − 553)/4` → 254 g.
  - Mantener usa 1,8 g/kg.
  - Ganar aplica +10 %.
  - Mujer de 45 kg, 150 cm, 60 años, sedentaria, bajar: queda en el tope (max(basal, 1.200)) con `topeAplicado: true`.
  - El tope del 1 % por semana limita el déficit.
  - Validación:
    - Altura de 100 → "La altura tiene que estar entre 120 y 230 cm".
    - Peso de 300 → mensaje de peso.
    - Fecha de nacimiento futura → "Revisá la fecha de nacimiento".
    - Edad de 10 años → mensaje de edad.
    - Perfil completo válido → `[]`.
  - `explicacion` contiene una línea con el gasto diario y otra con el ajuste por objetivo.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: calorías, macros y validación del perfil`.

### Task 3: Macros de un plato y exclusiones

**Files:** Create `src/core/nutricion/platos.ts`. Test: `tests/unit/core/nutricion/platos.test.ts`.

**Interfaces — Produces:**
```ts
type Macros = { kcal: number; proteina: number; grasas: number; carbos: number };
redondearGramos(g: number): number                     // a 5 g; a 1 g si son menos de 20 g
macrosDePlato(plato: Plato, alimentos: Map<string, Alimento>, factor = 1): Macros   // usa los gramos ya redondeados
gruposDePlato(plato: Plato, alimentos: Map<string, Alimento>): Grupo[]
platoExcluido(plato: Plato, alimentos: Map<string, Alimento>, grupos: Grupo[], texto: string[]): boolean
  // texto: coincide si alguna palabra normalizada (sin tildes, minúsculas) aparece en el nombre de un ingrediente
```

- [ ] **Step 1: Tests que fallan:**
  - Macros de un plato de dos ingredientes, con factor 1 y factor 1,5 (usando gramos redondeados).
  - `redondearGramos(123)` → 125; `(13)` → 13; `(17,6)` → 18.
  - Exclusión por grupo (un plato con queso queda fuera con "lacteos").
  - Exclusión por texto ("cebolla" excluye un plato con "Cebolla"; "brócoli" coincide con "Brocoli").
  - Sin restricciones no excluye nada.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: macros de platos y exclusiones`.

### Task 4: Armado del menú y alternativas

**Files:** Create `src/core/nutricion/azar.ts`, `menu.ts`. Test: `tests/unit/core/nutricion/menu.test.ts`.

**Interfaces — Consumes:** Task 1 a Task 3. **Produces:**
```ts
const REPARTOS: Record<3 | 4 | 5, { tipo: TipoComida; parte: number }[]>
interface ComidaMenu { tipo: TipoComida; platoId: string | null; factor: number }
interface DiaMenu { comidas: ComidaMenu[] }
type Entrada = { platos: Plato[]; alimentos: Map<string, Alimento>; metas: Metas; comidas: 3 | 4 | 5; noComoGrupos: Grupo[]; noComoTexto: string[]; semilla: number };
crearAzar(semilla: number): () => number            // mulberry32, valores en [0, 1)
armarMenu(e: Entrada): DiaMenu[]                       // 7 días
totalesDia(dia: DiaMenu, platos: Map<string, Plato>, alimentos: Map<string, Alimento>): Macros
alternativas(e: Entrada, menu: DiaMenu[], dia: number, comida: number): { platoId: string; factor: number; macros: Macros }[]  // hasta 5
```
**Algoritmo** (no queda determinado solo por los tests):
- Para cada día y comida, `objetivo = metas.kcal × parte`.
- Candidatos: los platos de ese tipo, sin exclusiones, con menos de 2 usos en la semana.
- Se toman hasta 6 al azar con la semilla.
- Por cada candidato, `factor = clamp(objetivo / kcalBase, 0,5, 2,5)`.
- Se elige el que minimiza `|kcal − objetivo| / objetivo + 0,5 · |proteínaAcum + proteína − metaProteinaParcial| / metas.proteina`, donde `metaProteinaParcial = metas.proteina × suma de las partes hasta esa comida`.
- Al cerrar el día, si las kcal totales quedan fuera de ±5 %, todos los factores del día se multiplican por `metas.kcal / total` (respetando el rango de 0,5 a 2,5) y se recalcula una vez.
- Sin candidatos: `platoId: null`, `factor: 0`.

- [ ] **Step 1: Tests que fallan** (con platos sintéticos y el contenido real):
  - El mismo resultado con la misma semilla y otro con una semilla distinta.
  - Cada día con el contenido real, perfil de 2.210 kcal y 4 comidas queda dentro de ±5 %.
  - Ningún plato aparece más de 2 veces.
  - Respeta "no como".
  - Las 3 y las 5 comidas usan los tipos del reparto.
  - Review Focus 1: excluir lácteos, huevo y gluten con el contenido real no tira error, y las comidas sin plato tienen `platoId null`.
  - Review Focus 2: con 1.200 kcal y platos grandes, el factor llega a 0,5 sin romperse y `totalesDia` devuelve el valor real.
  - `alternativas` devuelve como máximo 5, todas del mismo tipo, sin el plato actual, sin excluidos y ordenadas por cercanía.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: armado del menú semanal`.

### Task 5: Lista de compras y semanas

**Files:** Create `src/core/nutricion/compras.ts`, `semana.ts`. Test: `tests/unit/core/nutricion/compras.test.ts`, `semana.test.ts`.

**Interfaces — Produces:**
```ts
interface ItemCompra { alimentoId: string; nombre: string; gramos: number; texto: string }  // "6 huevos (300 g)" / "1,2 kg" / "250 g"
listaCompras(menu: DiaMenu[], platos: Map<string, Plato>, alimentos: Map<string, Alimento>): { categoria: Categoria; titulo: string; items: ItemCompra[] }[]
lunesDe(fecha: Date): string   // 'AAAA-MM-DD' del lunes de esa semana, en hora local
```

- [ ] **Step 1: Tests que fallan:**
  - La lista suma un mismo alimento usado en dos platos y dos días.
  - Agrupa en este orden: verdulería, carnicería, lácteos, panadería, almacén, otros.
  - Formato de cantidades:
    - 1000 g o más → "1,2 kg";
    - con unidad → "6 huevos (300 g)", redondeando hacia arriba;
    - sin unidad → "250 g".
  - Las comidas con `platoId null` no suman.
  - `lunesDe`: para el domingo 1/11/2026 devuelve "2026-10-26"; para el lunes 26/10 devuelve "2026-10-26".
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: lista de compras`.

### Task 6: Base de datos v2 y repositorio de nutrición

**Files:** Modify `src/data/db.ts` (tablas `perfil`, `pesos`, `menus`, `compras`), `src/data/idb.ts` (`VERSION_BASE = 2`). Create `src/data/repos/nutricion.ts`. Test: `tests/unit/data/nutricion.test.ts`, y que `backup.test.ts` siga pasando.

**Interfaces — Produces:**
```ts
interface RegistroPeso { id: string; fecha: number; kg: number }
interface MenuGuardado { id: string /* lunes */; semilla: number; perfilHash: string; dias: DiaMenu[] }
nutricionRepo = {
  perfil(): Promise<Perfil | undefined>; guardarPerfil(p: Perfil, pesoKg: number, ahora: number): Promise<void>, // también registra el peso
  pesoActual(): Promise<number | undefined>; pesos(): Promise<RegistroPeso[]>,
  menu(semana: string): Promise<MenuGuardado | undefined>; guardarMenu(m: MenuGuardado): Promise<void>,
  tachados(semana: string): Promise<string[]>; alternarTachado(semana: string, alimentoId: string): Promise<void>,
}
hashPerfil(p: Perfil, pesoKg: number): string   // en core/nutricion/perfil.ts: cambia si cambia algún dato que afecta las metas o el menú
```

- [ ] **Step 1: Tests que fallan:**
  - `guardarPerfil` guarda el perfil y agrega un registro de peso.
  - `pesoActual` devuelve el último.
  - Dos semanas distintas guardan menús separados (Review Focus 5).
  - `alternarTachado` agrega y quita.
  - Exportar y restaurar incluye las tablas nuevas.
  - `hashPerfil` cambia con el peso y el objetivo, y no cambia con `noComoTexto` en otro orden.
- [ ] **Step 2:** FAIL → implementar → PASS. Correr `npm run e2e` (las pruebas existentes tienen que seguir verdes con la base v2). Commit `feat: base de datos de nutrición`.

### Task 7: Pantallas "Mi plan" y "Tus números"

**Files:** Create `src/ui/pantallas/nutricion/Nutricion.tsx`, `MiPlan.tsx`. Modify `src/App.tsx` (rutas `/nutricion`, `/nutricion/plan`), y eliminar `Nutricion` de `Marcadores.tsx`. Test: `tests/e2e/nutricion.test.mjs`.

- [ ] **Step 1: Tests e2e que fallan:**
  - Sin perfil, Nutrición muestra "Armá tu plan".
  - Al completar el perfil (hombre, 30 años, 180 cm, "80" kg, moderado, bajar, 4 comidas) se ven "2.210 kcal", "160 g" de proteína, la explicación y el aviso de valores aproximados.
  - Una altura de 100 bloquea con el mensaje de error.
  - Cambiar el peso con un menú ya armado muestra "Tu plan cambió" (Review Focus 3).
- [ ] **Step 2:** FAIL → implementar:
  - MiPlan con campos grandes; peso con `inputMode="decimal"` y `parsearNumero`; chips de "no como" y texto libre separado por comas.
  - Nutricion con la tarjeta de metas, que si no hay menú de la semana lo genera con una semilla al azar y lo guarda.
  - → PASS. Commit `feat: mi plan y tus números`.

### Task 8: Menú de hoy, semana, cambiar plato y detalle

**Files:** Create `Semana.tsx`, `Plato.tsx`. Modify `Nutricion.tsx` (menú de hoy). Rutas `/nutricion/semana`, `/nutricion/plato/:dia/:comida`. Test: e2e.

- [ ] **Step 1: Tests e2e que fallan:**
  - Nutrición muestra las 4 comidas de hoy, cada una con nombre, kcal y proteína.
  - En la Semana, el lunes muestra 4 comidas y el total del día está dentro de ±5 % de 2.210.
  - "Cambiar" en el almuerzo muestra alternativas; elegir una reemplaza el plato y persiste al recargar.
  - "Rehacer semana" cambia al menos un plato.
  - El detalle muestra ingredientes con gramos escalados, pasos y macros.
- [ ] **Step 2:** FAIL → implementar → PASS. Captura en iPhone para revisar el diseño. Commit `feat: menú semanal y detalle de platos`.

### Task 9: Lista de compras

**Files:** Create `Compras.tsx`. Ruta `/nutricion/compras`. Test: e2e.

- [ ] **Step 1: Test e2e que falla:** se ven los grupos; tachar "Huevo" lo deja tachado al recargar; rehacer el menú conserva lo tachado (Review Focus 3).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: lista de compras`.

### Task 10: Verificación, revisión y publicación

- [ ] `npm run verificar` → todo verde.
- [ ] Revisión final independiente (code-reviewer.md), con la sección Review Focus.
- [ ] Arreglos con TDD.
- [ ] `git fetch` para ver si hay cambios de otra sesión, y después push a `main` para publicar.
