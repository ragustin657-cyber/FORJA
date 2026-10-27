# FORJA — Proyección de fuerza y metas

**Fecha:** 27 de octubre de 2026
**Base:** amplía la sección 7.1 ("Proyección: hasta dónde podés llegar") de `2026-10-26-forja-design.md`.
**Estado:** aprobado en la conversación; falta la revisión del documento escrito.

## 1. Alcance

**Incluye:**

- la proyección de la fuerza estimada (1RM) a 1, 3 y 6 meses, con rango y tope de prudencia según el nivel;
- una meta por ejercicio, con fecha estimada;
- el nivel de entrenamiento elegido en Ajustes, más un aviso cuando los números indican otro nivel.

**Fuera de alcance:**

- los planes de 12 semanas;
- la IA.

## 2. Decisiones de Agustín

- **Nivel:** las dos opciones. Lo elige él, y la app avisa si sus números indican otro nivel.
- **Metas:** sí, con un peso y repeticiones, y fecha estimada.
- **Cálculo:** opción A, la curva logarítmica con tope de prudencia.

## 3. Cálculo (`src/core/proyeccion.ts`)

**Entrada:** los puntos de fuerza del ejercicio (`puntosDeProgreso`, uno por sesión, con su `fecha` y su `e1rm`), la fecha de hoy y el nivel.

1. **Datos suficientes:** hacen falta 4 puntos o más, y que entre el primero y el último haya 21 días o más. Si no, el resultado es `{ estado: 'faltan-datos', faltanSesiones, faltanDias }`.
2. **Curva:** `t` = días desde el primer punto. Se ajusta `e1rm = a + b·ln(t + 1)` por mínimos cuadrados.
3. **Estable:** si `b ≤ 0`, el resultado es `{ estado: 'estable', hoy }`. Sin proyección ni fecha de meta.
4. **Hoy:** `base = a + b·ln(t_hoy + 1)`, con `t_hoy` = días desde el primer punto hasta hoy.
5. **Proyección a `m` meses** (con 30,44 días por mes):
   `p(m) = min( curva(t_hoy + 30,44·m), base · (1 + tasa)^m )`
   La tasa depende del nivel: principiante 0,05, intermedio 0,02, avanzado 0,01.
6. **Rango:**
   - `sd` = desvío de los residuos, `√(Σr² / (n − 2))`;
   - margen a `m` meses = `max(2,5, sd · (1 + m/3))`;
   - el rango es `p ± margen`, y el límite inferior nunca baja de `base − margen`.
7. **Redondeo:** a 0,5 kg todos los valores que se muestran.
8. **Resultado:** `{ estado: 'ok', hoy: base, meses: [{ m: 1 | 3 | 6, valor, min, max }] }`.

## 4. Meta (`src/core/metas.ts`)

**La meta:** `{ ejercicioId, peso, reps }`, con reps de 1 a 15 y 1 por defecto. El objetivo de fuerza es `e1rm(peso, reps)`, con la misma fórmula de Epley que el resto de la app.

**Progreso:** `mejor` es el mayor 1RM estimado del historial (`calcularRecords().mejorE1rm`), y el avance se calcula como `min(1, mejor / objetivo)`.

**Fecha estimada** (`fechaMeta(proyeccion, objetivo, mejor, ahora, curva)`), en orden:

1. Si `mejor ≥ objetivo` → `'lograda'`.
2. Si el estado es `faltan-datos` o `estable` → `'sin-estimar'`, con el motivo.
3. Si no, se busca el primer día `d` (de 0 a 730) en que `min(curva(t_hoy + d), base·(1 + tasa)^(d/30,44)) ≥ objetivo`:
   - `d ≤ 14` → `'pronto'`;
   - si lo encuentra → `{ dias: d, fecha }`;
   - si no → `'mas-de-2-anios'`.

**Cómo se muestra:**

- "Llegarías a fines de marzo de 2027, en unos 5 meses". Se usa "principios", "mediados" o "fines" del mes; si faltan menos de 2 meses, "en unas N semanas".
- "En las próximas 2 semanas".
- "Más de 2 años al ritmo actual".
- "¡Ya llegaste! 🏆".

## 5. Nivel (`src/core/nivel.ts`)

- **Dónde se guarda:** `Ajustes.nivel` ('principiante' / 'intermedio' / 'avanzado'), con intermedio por defecto. Se elige en la pantalla Ajustes, con la explicación "menos de 1 año / 1 a 3 años / más de 3 años entrenando".
- **Ejercicios de referencia (ids de la biblioteca):**

| Grupo | Ejercicios |
|---|---|
| banca | `Barbell_Bench_Press_-_Medium_Grip` |
| sentadilla | `Barbell_Squat` |
| peso muerto | `Barbell_Deadlift`, `Sumo_Deadlift` |
| press militar | `Standing_Military_Press`, `Barbell_Shoulder_Press`, `Seated_Barbell_Military_Press` |

- **Umbrales** (1RM estimado ÷ peso corporal):

| Grupo | Hombre: intermedio / avanzado | Mujer: intermedio / avanzado |
|---|---|---|
| banca | 1,0 / 1,5 | 0,6 / 0,9 |
| sentadilla | 1,25 / 1,75 | 0,9 / 1,3 |
| peso muerto | 1,5 / 2,25 | 1,1 / 1,6 |
| press militar | 0,65 / 0,9 | 0,4 / 0,6 |

- **`nivelSugerido(sexo, pesoKg, mejoresPorEjercicio)`:**
  - por grupo se usa el mejor 1RM estimado de los últimos 90 días, tomando el mejor ejercicio del grupo;
  - hacen falta 2 grupos o más con datos;
  - gana el nivel que tenga la mayoría de los grupos; si hay empate, el más bajo;
  - devuelve null si faltan datos o si no hay perfil.
- **Aviso:** si el nivel sugerido es distinto del elegido, aparece "Tus números en banca y sentadilla indican nivel avanzado", con el botón "Cambiar a avanzado". Se muestra en Ajustes y en la tarjeta de proyección. Nombra los grupos que coinciden con el nivel sugerido.

## 6. Pantallas

### 6.1 Progreso de un ejercicio

- **En el gráfico de fuerza:** si el estado es `ok`, se suma una línea punteada desde hoy hasta los 6 meses. Para eso `GraficoLinea` acepta puntos de proyección.
- **Tarjeta "Hasta dónde podés llegar"** (`aria-label`):
  - **Estado ok:**
    - "Hoy: 85 kg estimados";
    - tres filas: "En 1 mes: 87 kg (85–89)", "En 3 meses …" y "En 6 meses …";
    - el nivel en uso ("Ritmo de nivel intermedio · Cambiar"), que lleva a Ajustes.
  - **Estado estable:** "Tu fuerza viene estable. Cuando vuelvas a subir, la proyección se recalcula."
  - **Estado faltan-datos:** "Necesitás al menos 4 entrenamientos en 3 semanas para proyectar. Te faltan 2 entrenamientos y 6 días." Si una de las dos partes es 0, no se menciona.
  - **Aviso fijo:** "Es una estimación: depende de que entrenes, comas y descanses de forma constante."
  - **Aviso de nivel** (sección 5), si corresponde.
- **Tarjeta "Meta":**
  - **Sin meta:** el botón "Poner meta" abre el formulario con peso (kg) y repeticiones (1 por defecto), y el botón Guardar.
  - **Validación:** peso entre 1 y 500, y repeticiones de 1 a 15 enteras.
  - **Con meta:**
    - "100 kg × 1";
    - una barra de avance con "Te faltan 12 kg" (objetivo − mejor, redondeado a 0,5);
    - la fecha estimada (sección 4);
    - los botones "Editar" y "Quitar meta" (con el diálogo de confirmación).

### 6.2 Lista de Progreso

Debajo de la fuerza estimada de cada ejercicio con meta: "Meta 100 kg × 1 · 88 %", o "Meta lograda 🏆".

### 6.3 Ajustes

Selector de nivel con radios, más el aviso de nivel sugerido con su botón.

## 7. Datos

- **Tabla nueva `metas`:** `{ id (= ejercicioId), peso, reps, creada }`. La base pasa a la **versión 5** y la copia de seguridad la incluye sola.
- **Ajustes suma `nivel`** (por defecto 'intermedio').
- **Repositorio:** `metasRepo` con `todas()`, `de(ejercicioId)`, `guardar(meta)` y `quitar(ejercicioId)`.

## 8. Pruebas

- **Unitarias (cobertura del 100 %):**
  - Curva:
    - ajusta bien una serie generada con `a = 80` y `b = 3`;
    - pocos puntos o pocos días → `faltan-datos`, con lo que falta;
    - `b ≤ 0` → `estable`.
  - Proyección:
    - el tope de cada nivel recorta una curva muy empinada;
    - el rango crece con los meses y tiene un mínimo de 2,5;
    - redondeo a 0,5.
  - Meta: `lograda`, `pronto`, `sin-estimar`, fecha calculada y más de 2 años.
  - Texto de la fecha: principios, mediados o fines, y semanas.
  - Nivel sugerido: mayoría, empate, menos de 2 grupos, sin perfil, mujer, y la ventana de 90 días.
  - Repositorio de metas, y la copia de seguridad que las incluye.
- **Navegador:**
  - historial de 6 sesiones cargado → la tarjeta muestra hoy y 1/3/6 meses, y la línea de proyección;
  - historial corto → el mensaje de lo que falta;
  - poner una meta → fecha estimada y "Te faltan";
  - una meta ya lograda → "¡Ya llegaste!";
  - quitar la meta;
  - en Ajustes, cambiar el nivel cambia la proyección;
  - con un perfil de 80 kg y banca de 130 kg, sentadilla de 160 kg y peso muerto de 200 kg → aviso de avanzado, y "Cambiar a avanzado" lo aplica;
  - migración de la base v4 → v5.
