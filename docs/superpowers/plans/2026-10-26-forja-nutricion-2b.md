# FORJA Nutrición 2B — El día a día: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar lo que come Agustín partiendo del menú o en forma libre, con código de barras, anillos de calorías y proteína en Inicio, recordatorio y gráfico de peso, y ajuste de calorías cada 2 semanas.

**Architecture:**
- La lógica pura va en `src/core/nutricion/` (`registro.ts`, `productos.ts`, `peso.ts`, `ajuste.ts`) y `src/core/codigo.ts` (decodificación).
- ZXing se copia en `vendor/zxing/` y se resuelve con un alias de esbuild.
- Los datos van en las tablas `registros` y `productos` (IndexedDB v3) y se acceden por `src/data/repos/registro.ts`.
- Las pantallas van en `src/ui/pantallas/nutricion/` (Hoy, Agregar, Escaner) y suman cambios en Inicio y Progreso.

**Tech Stack:** el mismo de la fase 1, más ZXing 0.23 (Apache-2.0, incluido en `vendor/`).

**Spec:** `docs/superpowers/specs/2026-10-26-forja-nutricion-2b-design.md`

## Global Constraints

- Los mismos de las fases anteriores: textos en rioplatense, coma decimal, cobertura de 100 % en core y data, y las pantallas no importan data/db.
- Cada registro guarda una copia de sus macros, para que el historial no cambie si cambia el contenido.
- Open Food Facts:
  - URL `https://world.openfoodfacts.org/api/v2/product/{código}?fields=product_name,brands,nutriments,serving_quantity`;
  - tiempo máximo de 8 s;
  - campos `energy-kcal_100g` (o `energy_100g`/4,184), `proteins_100g`, `fat_100g`, `carbohydrates_100g`.
- Formatos de código: EAN_13, EAN_8, UPC_A, UPC_E.
- Etiqueta válida:
  - kcal entre 0 y 900;
  - cada macro entre 0 y 100 g;
  - la suma de las macros es 100 g o menos;
  - el nombre no está vacío.
- Ajuste:
  - pasos de 150 kcal;
  - pesos que abarquen al menos 28 días;
  - 14 días desde el último chequeo;
  - los umbrales de la tabla de la sección 6 del spec;
  - se aplica antes de los topes.
- Recordatorio de peso: 7 días desde el último registro.

## Review Focus

1. **Registro de un día pasado.** Si se registra en un día anterior que cae en otra semana, se usa el menú de esa semana; si no existe, no se muestra plato del menú y solo se puede agregar → prueba en la Task 6.
2. **Open Food Facts con datos raros.** Un producto con `nutriments` vacío, kcal en kJ o valores en texto ("12,5") no tiene que romper: o se convierte bien, o pasa a la carga manual → prueba en la Task 3.
3. **Código escrito con espacios o guiones.** Por ejemplo "7 790070 411716": se limpia; si después de limpiar no tiene 8, 12 o 13 dígitos, aparece el mensaje "Revisá el número" → prueba en la Task 3.
4. **Ajuste con pocos pesos o huecos.** Con un solo peso en cada quincena, o con 30 días sin pesarse, se calcula igual; si alguna de las dos ventanas de 14 días no tiene pesos, no se propone nada → prueba en la Task 4.
5. **Doble toque en "La comí".** No duplica el registro → prueba en la Task 6.

---

### Task 1: Decodificador de códigos de barras

**Files:** Create `scripts/copiar-zxing.mjs` (copia `src/` del repo clonado a `vendor/zxing/`), `vendor/ts-custom-error.ts` (reemplazo), `src/core/codigo.ts`. Modify `scripts/build.mjs` (alias `ts-custom-error`) y `bunfig.toml` (excluir `vendor/**` de la cobertura). Modify `LICENCIAS.md`. Test: `tests/unit/core/codigo.test.ts`.

**Interfaces — Produces:**
```ts
decodificarLuminancia(luminancia: Uint8ClampedArray, ancho: number, alto: number): string | null   // null si no hay código
limpiarCodigo(texto: string): string | null   // solo dígitos; null si no tiene 8, 12 o 13
```

- [ ] **Step 1: Tests que fallan:**
  - Un EAN-13 dibujado en los tests (codificador mínimo de prueba, como en el spike) con el código 7790070411716 se decodifica a "7790070411716".
  - Una imagen en blanco devuelve null.
  - `limpiarCodigo('7 790070-411716')` → '7790070411716'; `('123')` → null; `('12345678')` → '12345678'.
- [ ] **Step 2:** FAIL → copiar ZXing, agregar el alias en el build y en bun (`bunfig.toml` con preload o un import directo a `vendor/`) e implementar → PASS. Commit.

### Task 2: Registros y totales del día

**Files:** Create `src/core/nutricion/registro.ts`. Test: `tests/unit/core/nutricion/registro.test.ts`.

**Interfaces — Produces:**
```ts
type Origen = 'menu' | 'plato' | 'alimento' | 'producto';
interface Registro { id: string; fecha: string; tipo: TipoComida; origen: Origen; refId: string; cantidad: number; nombre: string; macros: Macros; creado: number }
macrosDeRegistro(origen, refId, cantidad, fuentes: { platos: Map<string, Plato>; alimentos: Map<string, Alimento>; productos: Map<string, Producto> }): Macros | null
totales(registros: Registro[]): Macros
porComida(registros: Registro[], tipos: TipoComida[]): Record<TipoComida, Registro[]>
recientes(registros: Registro[], limite = 20): Registro[]   // distintos por origen+refId, el más nuevo primero
fechaLocal(d: Date): string   // AAAA-MM-DD
```

- [ ] **Step 1: Tests que fallan:**
  - Macros de un plato con factor 1,5.
  - Macros de un alimento con 150 g.
  - Macros de un producto con 30 g.
  - Una referencia inexistente devuelve null.
  - `totales` suma.
  - `porComida` agrupa e incluye los tipos vacíos.
  - `recientes` quita duplicados y ordena.
  - `fechaLocal` usa la hora local.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 3: Productos (Open Food Facts y etiqueta manual)

**Files:** Create `src/core/nutricion/productos.ts`. Test: `tests/unit/core/nutricion/productos.test.ts`.

**Interfaces — Produces:**
```ts
interface Producto { id: string; nombre: string; marca?: string; kcal: number; proteina: number; grasas: number; carbos: number; porcionG?: number; origen: 'off' | 'manual' }
leerProductoOFF(codigo: string, json: unknown): Producto | null     // null = no encontrado o sin datos
validarEtiqueta(e: { nombre: string; kcal: number | null; proteina: number | null; grasas: number | null; carbos: number | null }): string[]
```

- [ ] **Step 1: Tests que fallan:**
  - Una respuesta normal se lee completa: nombre, marca, kcal, macros y `porcionG` de `serving_quantity`.
  - kcal que vienen solo en kJ se convierten.
  - Valores en texto ("12,5" o "12.5") se convierten.
  - Respuestas que devuelven null:
    - `status: 0`;
    - `nutriments` vacío;
    - kcal y las tres macros faltantes (Review Focus 2).
  - Si no hay nombre, queda "Producto {código}".
  - `validarEtiqueta`:
    - nombre vacío;
    - kcal mayor a 900;
    - macro negativa;
    - suma de macros mayor a 100;
    - una etiqueta válida devuelve `[]`.
  - Review Focus 3 vive en `limpiarCodigo` (Task 1). Se agrega acá un caso con guiones y espacios.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 4: Peso, recordatorio y ajuste quincenal

**Files:** Create `src/core/nutricion/peso.ts`, `ajuste.ts`. Modify `calorias.ts` (aplica `perfil.ajusteKcal ?? 0`) y `perfil.ts` (campos opcionales `ajusteKcal?`, `ultimoAjuste?`; se incluyen en `hashPerfil`). Tests: `peso.test.ts`, `ajuste.test.ts`, y casos nuevos en `calorias.test.ts`.

**Interfaces — Produces:**
```ts
necesitaPesarse(ultimaFecha: number | undefined, ahora: number): boolean   // undefined = true
promedioMovil(pesos: { fecha: number; kg: number }[], dias = 7): { fecha: number; kg: number }[]
type Propuesta = { delta: 150 | -150; cambioKgSemana: number; motivo: string; kcalAntes: number; kcalDespues: number }
proponerAjuste(perfil: Perfil, pesos: { fecha: number; kg: number }[], ahora: number): Propuesta | null | 'sin-cambios'
  // null = todavía no corresponde revisar; 'sin-cambios' = se revisó y está bien
```

- [ ] **Step 1: Tests que fallan:**
  - Recordatorio de peso: 6 días → no; 7 → sí; sin pesos → sí.
  - Promedio móvil de 7 días.
  - Una fila por cada caso de la tabla del spec (bajar lento, bajar rápido, bien, mantener sube, mantener baja, ganar lento, ganar rápido).
  - Pesos que abarcan menos de 28 días → null.
  - Menos de 14 días desde `ultimoAjuste` → null.
  - Una ventana sin pesos → null (Review Focus 4).
  - Si el ajuste no mueve las calorías por estar en el tope → 'sin-cambios'.
  - `calcularMetas` aplica `ajusteKcal` −150 (2.210 → 2.060) y respeta el piso.
  - `motivo` dice "bajaste 0,1 kg por semana, más lento de lo buscado".
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 5: Base de datos v3 y repositorio de registros

**Files:** Modify `src/data/db.ts` (tablas `registros`, `productos`), `src/data/idb.ts` (`VERSION_BASE = 3`). Create `src/data/repos/registro.ts`. Test: `tests/unit/data/registro.test.ts`, `tests/e2e/migracion.test.mjs` (caso v2 → v3).

**Interfaces — Produces:**
```ts
registroRepo = {
  delDia(fecha: string): Promise<Registro[]>; todos(): Promise<Registro[]>;
  agregar(r: Omit<Registro, 'id' | 'creado'>, ahora: number): Promise<Registro>;
  borrar(id: string): Promise<void>;
  producto(id: string): Promise<Producto | undefined>; productos(): Promise<Producto[]>; guardarProducto(p: Producto): Promise<void>;
}
nutricionRepo.guardarAjuste(ajusteKcal: number, ultimoAjuste: number): Promise<void>
nutricionRepo.registrarPeso(kg: number, ahora: number): Promise<void>
```

- [ ] **Step 1: Tests que fallan:**
  - Agregar y borrar.
  - `delDia` filtra por fecha y ordena por `creado`.
  - Los productos se guardan y se recuperan.
  - `guardarAjuste` y `registrarPeso` funcionan.
  - El backup incluye las tablas nuevas.
  - En e2e, una base v2 con perfil y una rutina pasa a v3 sin perder nada.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 6: Pantalla "Hoy" y "La comí"

**Files:** Create `src/ui/pantallas/nutricion/Hoy.tsx`. Modify `Nutricion.tsx` (acceso "Registrar lo que comí"). Ruta `/nutricion/hoy/:fecha?`. Test: `tests/e2e/registro.test.mjs`.

- [ ] **Step 1: Tests e2e que fallan:**
  - "La comí" en el almuerzo suma sus kcal al total del día y el botón pasa a "Registrado ✓".
  - Un doble toque no duplica (Review Focus 5).
  - La porción ½ registra la mitad.
  - Borrar un ítem lo quita del total.
  - La flecha "Día anterior" muestra ayer.
  - Un día de una semana sin menú no muestra el plato del menú y deja agregar (Review Focus 1).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 7: Agregar: recientes, platos y alimentos

**Files:** Create `src/ui/pantallas/nutricion/Agregar.tsx`. Ruta `/nutricion/agregar/:fecha/:tipo`. Test: e2e.

- [ ] **Step 1: Tests e2e que fallan:**
  - Agregar "Banana" con 120 g en la merienda suma 107 kcal.
  - Agregar un plato con porción 1 lo registra.
  - Después aparece en Recientes y se agrega de un toque.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 8: Código de barras

**Files:** Create `src/ui/pantallas/nutricion/Escaner.tsx` (la cámara con ZXing usa `decodificarLuminancia` sobre los cuadros de un canvas), y `src/ui/openfoodfacts.ts` (fetch con tiempo máximo). Pestaña en Agregar. Test: e2e con `page.route` sobre la URL de Open Food Facts.

- [ ] **Step 1: Tests e2e que fallan:**
  - Escribir el código con Open Food Facts simulado como encontrado → muestra el nombre; con 30 g lo registra con las kcal correctas.
  - El producto queda guardado: con Open Food Facts "caído", el mismo código se encuentra igual.
  - Con un código no encontrado → aparece el formulario de etiqueta; al completarlo se registra.
  - Sin internet (la ruta aborta) → aparece el aviso y el formulario de etiqueta.
  - Un número inválido → "Revisá el número".
  - Sin permiso de cámara → aparece el mensaje y se puede escribir el número.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 9: Anillos en Inicio, recordatorio de peso y gráfico de peso

**Files:** Create `src/ui/componentes/Anillos.tsx`. Modify `Inicio.tsx`, `Progreso.tsx`. Test: e2e.

- [ ] **Step 1: Tests e2e que fallan:**
  - Con el perfil cargado y un registro, Inicio muestra los anillos con "x de 2.210 kcal" y "y de 160 g"; tocarlos lleva a Hoy.
  - Sin perfil, no hay anillos.
  - Con el último peso de hace 8 días (cargado directo en IndexedDB) aparece "Toca pesarte"; al guardar 79,5, la tarjeta desaparece y Progreso muestra "Peso corporal" con el gráfico.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 10: Tarjeta de ajuste quincenal

**Files:** Modify `Nutricion.tsx`. Test: e2e, con pesos de 30 días cargados por IndexedDB.

- [ ] **Step 1: Tests e2e que fallan:**
  - Bajando lento aparece "Te proponemos 150 kcal menos"; Aplicar → "Tus números" muestra 2.060 y aparece "Tu plan cambió".
  - "Ahora no" oculta la tarjeta y no vuelve al recargar.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 11: Verificación, revisión y publicación

- [ ] `npm run verificar` → todo verde.
- [ ] Revisión final independiente, con la sección Review Focus.
- [ ] Arreglos con TDD.
- [ ] `git fetch`, merge a main y push.
