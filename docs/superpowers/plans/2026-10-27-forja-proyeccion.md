# FORJA Proyección de fuerza y metas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proyección de la fuerza estimada a 1, 3 y 6 meses con tope por nivel, una meta por ejercicio con fecha estimada, y un nivel elegido en Ajustes con aviso del nivel que sugieren tus números.

**Architecture:**
- La lógica pura va en `src/core/proyeccion.ts`, `src/core/metas.ts` y `src/core/nivel.ts`.
- Los datos van en la tabla `metas` (IndexedDB v5) y en `Ajustes.nivel`.
- Las pantallas que cambian son `ProgresoEjercicio`, `Progreso` y `Ajustes`.

**Tech Stack:** el de siempre.

**Spec:** `docs/superpowers/specs/2026-10-27-forja-proyeccion-design.md`

## Global Constraints

- Textos en rioplatense, con coma decimal. Cobertura del 100 % en `src/core` y `src/data` (salvo `idb.ts`).
- Mínimo para proyectar: 4 puntos y 21 días entre el primero y el último.
- Mes = 30,44 días. Tasas por mes: principiante 0,05, intermedio 0,02, avanzado 0,01.
- Margen = `max(2,5, sd·(1 + m/3))`. Los valores que se muestran se redondean a 0,5 kg.
- La meta usa `e1rm(peso, reps)`, con reps de 1 a 15 y peso de 1 a 500. Se busca la fecha hasta 730 días; 14 días o menos cuenta como "pronto".
- Nivel sugerido:
  - usa los últimos 90 días;
  - hacen falta 2 grupos o más con datos;
  - gana la mayoría, y si hay empate el nivel más bajo;
  - los umbrales y los ids salen de la sección 5 del spec.

## Review Focus

1. **Historial con sesiones del mismo día, o desordenado.** La curva no se rompe (ordena por fecha) y no aparecen NaN → prueba en la Task 1.
2. **Puntos todos el mismo día** (span 0 con 4 sesiones). Tiene que dar `faltan-datos` y nunca dividir por cero → prueba en la Task 1.
3. **Meta escrita "100,5" o reps "0" / "20" / "5,5".** El peso con coma se acepta; las reps inválidas muestran su error → prueba en la Task 2.
4. **Último entrenamiento hace mucho** (por ejemplo, 3 meses). `base` se extrapola a hoy, pero el tope sigue contando desde hoy; no hay valores absurdos ni negativos → prueba en la Task 1.
5. **Perfil sin peso o nivel sugerido igual al elegido.** No aparece el aviso → prueba en la Task 5.

---

### Task 1: Curva y proyección

**Files:** Create `src/core/proyeccion.ts`. Test: `tests/unit/core/proyeccion.test.ts`.

**Interfaces — Produces:**
```ts
type Nivel = 'principiante' | 'intermedio' | 'avanzado'; const TASA: Record<Nivel, number>; const NIVELES: { id: Nivel; nombre: string; detalle: string }[]
type Punto = { fecha: number; e1rm: number }
type Curva = { a: number; b: number; inicio: number; sd: number }      // inicio = fecha (ms) del primer punto
ajustarCurva(puntos: Punto[]): Curva | null                             // null con < 2 puntos o con todos el mismo día
valorCurva(c: Curva, fecha: number): number                            // a + b·ln(días desde inicio + 1)
type MesProyectado = { m: 1 | 3 | 6; valor: number; min: number; max: number }
type Proyeccion =
  | { estado: 'faltan-datos'; faltanSesiones: number; faltanDias: number }
  | { estado: 'estable'; hoy: number }
  | { estado: 'ok'; hoy: number; base: number; curva: Curva; tasa: number; ahora: number; meses: MesProyectado[] }   // hoy = base redondeado
proyectar(puntos: Punto[], ahora: number, nivel: Nivel): Proyeccion
proyectadoEn(p: Extract<Proyeccion, { estado: 'ok' }>, dias: number): number   // sin redondear: min(curva(ahora + d), base·(1+tasa)^(d/30,44))
```

- [ ] **Step 1: Tests que fallan**, con `pts(a, b, dias)` = puntos con `e1rm = a + b·ln(d + 1)` en los días dados, y `ahora` = día 35:
  - `ajustarCurva(pts(80, 3, [0, 7, 14, 21, 28, 35]))` → a ≈ 80, b ≈ 3 y sd ≈ 0 (`toBeCloseTo`, 6 decimales).
  - Los mismos puntos desordenados y uno duplicado el mismo día → sin NaN, con a y b cerca (Review Focus 1).
  - `faltan-datos`:
    - 3 puntos en 10 días → `{ faltanSesiones: 1, faltanDias: 11 }`;
    - 4 puntos el mismo día → `faltanDias: 21` (Review Focus 2).
  - Estable: `pts(90, 0, …)` y `pts(100, -2, …)` → `{ estado: 'estable', hoy }`, con hoy redondeado a 0,5.
  - Intermedio con (80, 3): `hoy` = 91 y `meses` = 92,5 / 94,5 / 96. Avanzado: 91,5 / 93,5 / 96.
  - Curva empinada (60, 15), intermedio: el tope recorta → 116 / 120,5 / 128, cuando la curva sola daría 123 / 132,5 / 141.
  - Rango: el margen es 2,5 con sd 0; con ruido (sd > 2,5) el margen a 6 meses es mayor que a 1 mes; y `min ≥ hoy − margen`.
  - Último punto hace 90 días: los valores siguen siendo finitos, mayores que 0 y crecientes (Review Focus 4).
- [ ] **Step 2:** FAIL → implementar (mínimos cuadrados sobre `x = ln(t + 1)`, con `sd` de los residuos dividido `n − 2`; con n = 2, sd = 0) → PASS. Commit.

### Task 2: Metas

**Files:** Create `src/core/metas.ts`. Test: `tests/unit/core/metas.test.ts`.

**Interfaces — Consumes:** Task 1. **Produces:**
```ts
interface Meta { id: string /* ejercicioId */; peso: number; reps: number; creada: number }
validarMeta(peso: string, reps: string): { valores?: { peso: number; reps: number }; errores: string[] }
objetivoMeta(m: { peso: number; reps: number }): number          // e1rm
avance(mejor: number | null, objetivo: number): number           // 0..1
type EstadoMeta = { tipo: 'lograda' } | { tipo: 'sin-estimar'; motivo: 'faltan-datos' | 'estable' } | { tipo: 'pronto' } | { tipo: 'fecha'; dias: number; fecha: number } | { tipo: 'mas-de-2-anios' }
fechaMeta(p: Proyeccion, objetivo: number, mejor: number | null): EstadoMeta
textoMeta(e: EstadoMeta, ahora: number): string
faltaKg(mejor: number | null, objetivo: number): number           // redondeado a 0,5, mínimo 0
```

- [ ] **Step 1: Tests que fallan:**
  - `validarMeta`:
    - "100,5" y "1" → valores;
    - peso "" o "600" → "El peso tiene que estar entre 1 y 500 kg.";
    - reps "0", "20" o "5,5" → "Las repeticiones tienen que ser un número entero de 1 a 15." (Review Focus 3);
    - reps vacío → 1.
  - `objetivoMeta({ peso: 100, reps: 1 })` es igual a `e1rm(100, 1)`.
  - `avance`: (null, 100) → 0; (88, 100) → 0,88; (120, 100) → 1.
  - `fechaMeta`:
    - mejor ≥ objetivo → `lograda`;
    - `faltan-datos` y `estable` → `sin-estimar`, con su motivo;
    - curva (60, 15) intermedio con objetivo 120 → `{ tipo: 'fecha', dias: 83 }`;
    - objetivo ≤ `proyectadoEn(p, 14)` → `pronto`;
    - objetivo 400 → `mas-de-2-anios`.
  - `textoMeta`, con `ahora` = 27/10/2026:
    - 83 días → "Llegarías a mediados de enero de 2027, en unas 12 semanas";
    - 150 días → "Llegarías a fines de marzo de 2027, en unos 5 meses";
    - `pronto` → "En las próximas 2 semanas";
    - `mas-de-2-anios` → "Más de 2 años al ritmo actual";
    - `lograda` → "¡Ya llegaste! 🏆";
    - `sin-estimar` / `estable` → "Cuando vuelvas a subir, estimamos la fecha.";
    - `sin-estimar` / `faltan-datos` → "Con más entrenamientos estimamos la fecha."
    - Reglas:
      - días 1–10 = principios, 11–20 = mediados, 21+ = fines;
      - menos de 61 días → "en unas N semanas" (redondeado);
      - si no, "en unos N meses" (`round(dias / 30,44)`).
  - `faltaKg(88, 100)` → 12; con mejor ≥ objetivo → 0.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 3: Nivel sugerido

**Files:** Create `src/core/nivel.ts`. Test: `tests/unit/core/nivel.test.ts`.

**Interfaces — Consumes:** `Nivel` (Task 1). **Produces:**
```ts
type Grupo = 'banca' | 'sentadilla' | 'peso muerto' | 'press militar'
const GRUPOS: Record<Grupo, string[]>   // ids de la sección 5 del spec
nivelSugerido(sexo: 'hombre' | 'mujer' | undefined, pesoKg: number | undefined, sesiones: { ejercicioId: string; fecha: number; e1rm: number }[], ahora: number): { nivel: Nivel; grupos: Grupo[] } | null
textoNivel(s: { nivel: Nivel; grupos: Grupo[] }): string   // "Tus números en banca y sentadilla indican nivel avanzado."
```

- [ ] **Step 1: Tests que fallan:**
  - Hombre de 80 kg con banca 130, sentadilla 160 y peso muerto 200 (hace 10 días) → avanzado, con grupos ['banca', 'sentadilla', 'peso muerto'].
  - Hombre de 80 kg con banca 85 (intermedio) y sentadilla 150 (avanzado) → empate, gana intermedio, con grupos ['banca'].
  - Un solo grupo → null.
  - Sin sexo o sin peso → null (Review Focus 5).
  - Mujer de 60 kg con banca 40 (0,67 → intermedio) y sentadilla 60 (1,0 → intermedio) → intermedio. Mujer de 60 kg con banca 30 y sentadilla 45 → principiante.
  - Datos de hace 100 días se ignoran.
  - Dentro de un grupo se usa el mejor ejercicio (`Sumo_Deadlift` por encima de `Barbell_Deadlift`).
  - `textoNivel`: un grupo → "Tus números en banca indican nivel avanzado."; tres → "en banca, sentadilla y peso muerto".
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 4: Datos: metas (v5) y nivel en Ajustes

**Files:** Modify `src/data/db.ts` (agregar `metas` a TABLAS), `src/data/idb.ts` (VERSION_BASE = 5), `src/data/tipos.ts` y `src/data/repos/ajustes.ts` (`nivel: Nivel`, por defecto 'intermedio'). Create `src/data/repos/metas.ts`. Tests: `tests/unit/data/metas.test.ts`, `tests/unit/data/repos.test.ts` (defaults), `tests/e2e/migracion.test.mjs` (v4 → v5, y las versiones esperadas pasan a 5).

**Interfaces — Produces:** `metasRepo = { todas(): Promise<Meta[]>; de(ejercicioId): Promise<Meta | undefined>; guardar(m: Meta): Promise<void>; quitar(ejercicioId): Promise<void> }`

- [ ] **Step 1: Tests que fallan:**
  - Guardar, reemplazar, quitar y listar metas.
  - El default de `nivel` es 'intermedio'.
  - La copia de seguridad incluye las metas.
  - En e2e, la migración v4 → v5 conserva fotos y medidas.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 5: Nivel en Ajustes, con aviso

**Files:** Modify `src/ui/pantallas/Ajustes.tsx`. Create `src/ui/nivel.ts` (`cargarSugerencia(): Promise<{ nivel; grupos } | null>`, que junta el perfil, el último peso y los mejores e1rm por sesión de los ejercicios de `GRUPOS`, y devuelve null si coincide con el nivel elegido). Test: `tests/e2e/proyeccion.test.mjs`.

- Hay un radiogroup "Nivel de entrenamiento" con los tres niveles y sus detalles ("Menos de 1 año entrenando", "De 1 a 3 años", "Más de 3 años").
- La región "Nivel sugerido" (aria-label) muestra `textoNivel` y el botón "Cambiar a avanzado".

- [ ] **Step 1: Tests e2e que fallan**, con historial cargado por IndexedDB (helper `cargarHistorial(p, ejercicioId, [[díasAtrás, peso, reps], …])`, que crea sesiones finalizadas):
  - Por defecto está marcado intermedio; elegir avanzado se guarda y sigue marcado al recargar.
  - Con plan de 80 kg y banca 130×1, sentadilla 160×1 y peso muerto 200×1 → "Tus números en banca, sentadilla y peso muerto indican nivel avanzado."; "Cambiar a avanzado" lo marca y el aviso desaparece.
  - Sin plan → no hay aviso (Review Focus 5).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 6: Tarjeta "Hasta dónde podés llegar" y línea de proyección

**Files:** Modify `src/ui/pantallas/ProgresoEjercicio.tsx`, `src/ui/componentes/GraficoLinea.tsx` (prop opcional `proyeccion?: { x: number; y: number }[]`, que dibuja una línea punteada dorada al 50 %, extiende el eje X por tiempo y suma `aria-label="Proyección"` a ese path). Test: `tests/e2e/proyeccion.test.mjs`.

- `GraficoLinea` hoy reparte los puntos por índice. Con `proyeccion`, ubica todo por fecha (x) entre el primer punto y el último de la proyección. Sin `proyeccion` queda igual.
- La proyección en el gráfico tiene los puntos de hoy, +1, +3 y +6 meses (con `proyectadoEn`).
- La tarjeta tiene `aria-label="Hasta dónde podés llegar"` y los textos de la sección 6.1 del spec. "Cambiar" es un enlace a `/mas/ajustes`.

- [ ] **Step 1: Tests e2e que fallan:**
  - Banca con 6 sesiones en 5 semanas, con subida suave → "Hoy: … kg estimados" y "En 1 mes:", "En 3 meses:", "En 6 meses:"; el gráfico tiene `getByLabel('Proyección')`.
  - Con 2 sesiones → "Te faltan 2 entrenamientos y …".
  - Pesos iguales en las 6 sesiones → "Tu fuerza viene estable".
  - Cambiar el nivel a principiante en Ajustes cambia el texto de 6 meses (el valor es mayor o igual).
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 7: Meta en el ejercicio y en la lista de Progreso

**Files:** Modify `ProgresoEjercicio.tsx` (tarjeta con `aria-label="Meta"`), `Progreso.tsx` (texto de la meta por ejercicio). Test: `tests/e2e/proyeccion.test.mjs`.

- [ ] **Step 1: Tests e2e que fallan:**
  - "Poner meta" con 120 y 1 → se ve "120 kg × 1", "Te faltan … kg" y una fecha que empieza con "Llegarías" o "Más de 2 años".
  - "Editar" a 50 × 1 (ya lograda) → "¡Ya llegaste! 🏆".
  - En la lista de Progreso, ese ejercicio dice "Meta lograda 🏆"; con una meta no lograda dice "Meta 120 kg × 1 · N %".
  - Reps "20" → aparece el error de repeticiones.
  - "Quitar meta" con confirmación → vuelve "Poner meta".
- [ ] **Step 2:** FAIL → implementar → PASS. Commit.

### Task 8: Verificación, revisión y publicación

- [ ] `npm run verificar` → todo verde. Capturas de ProgresoEjercicio y Ajustes para revisar cómo se ven.
- [ ] Revisión final independiente, con la sección Review Focus.
- [ ] Arreglos con TDD.
- [ ] Merge, push y deploy.
