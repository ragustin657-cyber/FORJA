# FORJA — Planes de 12 semanas

**Fecha:** 27 de octubre de 2026
**Base:** amplía la sección 7.2 de `2026-10-26-forja-design.md`.
**Estado:** aprobado en la conversación; falta la revisión del documento escrito.

## 1. Alcance y decisiones

- **Incluye:**
  - armar un plan según objetivo, días, equipo e inicio;
  - una rutina de plan editable;
  - progresión por bloques con semana de descarga;
  - el plan manda en Inicio;
  - una tarjeta con el calendario;
  - terminar el plan, o ver el final de las 12 semanas.
- **Fuera de alcance:** la IA. Agustín decidió dejarla para más adelante ("No por ahora"). La app queda completa sin ella.
- **Decisión de Agustín:** con un plan activo, el plan manda en Inicio y sus rutinas propias quedan guardadas y usables.

## 2. Armar un plan

En Entrenar, el botón **"Armar un plan"** lleva a la ruta `/entrenar/plan/nuevo`, un formulario de una pantalla:

- **Objetivo:** Fuerza / Ganar músculo / Bajar grasa / Forma general.
- **Días por semana:** 3, 4, 5 o 6.
- **Equipo:**
  - Gimnasio completo;
  - Mancuernas (mancuernas, peso corporal y bandas);
  - Casa (peso corporal y bandas).
- **Inicio:** "Este lunes" (el lunes de esta semana) o "El lunes que viene".
- **Nivel:** se toma de Ajustes y se muestra ("Nivel intermedio · Cambiar").

Al tocar **"Crear plan"**:

- si ya hay un plan activo, aparece el diálogo "Ya tenés un plan activo. ¿Reemplazarlo?";
- después se crea la rutina y el plan, y se va a Entrenar.

## 3. Generación (`src/core/planes.ts`)

### 3.1 Patrones y candidatos

`src/contenido/patrones.json` define, por patrón, la lista ordenada de ejercicios candidatos para cada equipo: `{ "sentadilla": { "gimnasio": [...ids], "mancuernas": [...], "casa": [...] }, … }`.

- **Patrones:** sentadilla, bisagra, empuje-horizontal, empuje-vertical, tiron-horizontal, tiron-vertical, unilateral, femoral, cuadriceps, gemelos, pecho-aislado, hombro-lateral, hombro-posterior, biceps, triceps, core.
- **Qué ejercicios pueden ser candidatos:** solo los traducidos (`traducido: true`), que existan en la biblioteca y cuyo equipo encaje:
  - gimnasio: cualquiera;
  - mancuernas: dumbbell, body only y bands;
  - casa: body only y bands.
- **Cobertura mínima:** cada patrón tiene al menos 2 candidatos en gimnasio y al menos 1 en mancuernas. En casa puede faltar alguno; ese hueco se saltea.

### 3.2 Plantillas

Cada día es una lista de huecos `patrón[:variante]`. La variante es el índice del candidato: 0 por defecto y 1 para la variante. Los **2 primeros huecos son los básicos**.

| Día | Huecos |
|---|---|
| Cuerpo A | sentadilla, empuje-horizontal, tiron-horizontal, empuje-vertical, femoral, core |
| Cuerpo B | bisagra, empuje-vertical, tiron-vertical, unilateral, triceps, core |
| Cuerpo C | sentadilla:1, tiron-vertical, empuje-horizontal:1, unilateral:1, biceps, core |
| Torso A | empuje-horizontal, tiron-horizontal, empuje-vertical, tiron-vertical, triceps, biceps |
| Torso B | empuje-vertical:1, tiron-vertical:1, empuje-horizontal:1, tiron-horizontal:1, hombro-lateral, biceps:1 |
| Piernas A | sentadilla, bisagra, unilateral, femoral, gemelos, core |
| Piernas B | bisagra:1, sentadilla:1, cuadriceps, femoral:1, gemelos, core |
| Empuje A | empuje-horizontal, empuje-vertical, pecho-aislado, hombro-lateral, triceps, triceps:1 |
| Tirón A | tiron-vertical, tiron-horizontal, tiron-horizontal:1, hombro-posterior, biceps, biceps:1 |
| Empuje B | empuje-vertical:1, empuje-horizontal:1, pecho-aislado:1, hombro-lateral, triceps:1, core |
| Tirón B | tiron-horizontal:1, tiron-vertical:1, hombro-posterior, unilateral, biceps:1, core |

**Días por semana:**

- 3 días: Cuerpo A, B y C.
- 4 días: Torso A, Piernas A, Torso B, Piernas B.
- 5 días: Empuje A, Tirón A, Piernas A, Torso A, Piernas B.
- 6 días: Empuje A, Tirón A, Piernas A, Empuje B, Tirón B, Piernas B.

**Elección del ejercicio de cada hueco:**

- Se toma `candidatos[equipo][variante]`.
- Si ese índice no existe, se toma el último disponible. Si no hay ninguno, el hueco se saltea.
- Dentro de un mismo día no se repite un ejercicio: si se repite, se toma el siguiente candidato que no esté usado, y si no hay, se saltea.

**Principiante:** se quita el último hueco de cada día.

### 3.3 Parámetros por objetivo

| Objetivo | Series básicos / accesorios | Repeticiones básicos / accesorios | Descanso básicos / accesorios |
|---|---|---|---|
| Fuerza | 5 / 4 | 3–6 / 6–10 | 180 s / 120 s |
| Ganar músculo | 4 / 3 | 8–12 / 8–12 | 90 s / 60 s |
| Bajar grasa | 3 / 3 | 10–15 / 10–15 | 60 s / 45 s |
| Forma general | 3 / 3 | 8–12 / 8–12 | 90 s / 60 s |

**Resultado de `generarPlan(entrada, ejercicios, patrones)`:**

- una `Rutina` con `origen: 'plan'`;
- nombre "Plan de <objetivo> · <N> días", por ejemplo "Plan de ganar músculo · 4 días";
- un día por plantilla, cada uno con nombre ("Torso A") y ejercicios `{ ejercicioId, series, repsMin, repsMax, descanso, basico }`.

## 4. Semanas y bloques

- **Semana del plan:** `semana = floor((hoy − inicio) / 7 días) + 1`, contando con fechas locales.
  - Si `semana < 1`, el plan está "por empezar".
  - Si `semana > 12`, el plan está "terminado".
- **Semana dentro del bloque:** `s = ((semana − 1) % 4) + 1`. El bloque es `ceil(semana / 4)`.
- **Ajuste de series según `s`** (`seriesDeSemana`):

| Semana del bloque | Series | Peso sugerido |
|---|---|---|
| 1 | base − 1 (mínimo 2) | normal |
| 2 | base | normal |
| 3 | base + 1 en los básicos; accesorios en base | normal |
| 4 (descarga) | `max(1, round(base × 0,6))` | sugerencia × 0,9, redondeada al incremento |

- **Dónde se aplica:** al empezar un día de la rutina del plan activo. La sesión se crea con las series de la semana y, en descarga, la sugerencia de peso se multiplica por 0,9.
- **La rutina guarda la base.** Si se edita, la base nueva es la que se ajusta.
- **En la sesión:** un aviso arriba dice "Semana 3 de 12 · Bloque 1". En descarga dice "Semana de descarga: más liviano a propósito, para recuperarte".

## 5. El plan manda

- **Inicio:** si hay un plan activo (no "por empezar" ni "terminado"), "Hoy toca" usa la rutina del plan con la lógica de siempre (`proximoDia`). Muestra "Semana 3 de 12 · Bloque 1" y la marca "Descarga" cuando corresponde.
  - **Por empezar:** "Tu plan arranca el lunes 2/11", y "Hoy toca" sigue con la lógica actual.
  - **Terminado:** aparece la tarjeta "¡Terminaste tu plan de 12 semanas! 🏆", con "Armar otro plan" y "Volver a mis rutinas". La segunda marca el plan como terminado y "Hoy toca" vuelve a la lógica actual.
- **Entrenar:** arriba aparece la tarjeta del plan (`aria-label="Tu plan"`) con:
  - el nombre;
  - una tira de 12 casillas: la actual resaltada, las descargas (semanas 4, 8 y 12) marcadas con "D" y las pasadas atenuadas;
  - "Esta semana: 2 de 4 entrenamientos", contando sesiones terminadas de la rutina del plan de lunes a domingo;
  - "Editar rutina", que lleva al editor de siempre;
  - "Terminar plan", con confirmación.
- **Rutinas propias:** siguen en la lista de Entrenar como siempre.
- **Un solo plan activo:** al reemplazar, el plan anterior pasa a `estado: 'cortado'` y su rutina queda guardada como rutina normal.

## 6. Datos

| Tabla | Campos |
|---|---|
| planes | id, rutinaId, objetivo, dias (3–6), equipo, inicio (AAAA-MM-DD, lunes), creado, estado ('activo' / 'terminado' / 'cortado') |

- Los ejercicios de la rutina suman un campo opcional `basico?: boolean`.
- La base pasa a la **versión 6**, y la copia de seguridad incluye la tabla nueva.

## 7. Pruebas

- **Unitarias (cobertura del 100 %):**
  - `patrones.json`: cada id existe, está traducido y encaja con su equipo; se cumple la cobertura mínima de 3.1.
  - Plantillas por cantidad de días.
  - Elección del ejercicio con variante, el último disponible, un hueco salteado y sin repetidos en el día.
  - Principiante con un hueco menos.
  - Parámetros por objetivo.
  - `semanaDelPlan`: antes, durante, 12, 13 y cambio de día a la medianoche local.
  - `seriesDeSemana` para las semanas 1 a 4 y el mínimo.
  - Peso de descarga redondeado.
  - "Esta semana N de M".
  - Repositorio de planes, con el reemplazo que corta el anterior.
- **Navegador:**
  - armar un plan de 4 días en gimnasio → Entrenar muestra la tarjeta con 12 casillas, e Inicio muestra "Torso A" con "Semana 1 de 12";
  - empezar el día crea la sesión con las series de la semana 1;
  - con el inicio movido 3 semanas atrás (semana 4) → aviso de descarga, series reducidas y peso sugerido al 90 %;
  - con el inicio 13 semanas atrás → "¡Terminaste…!"; "Volver a mis rutinas" restituye la rutina propia en Inicio;
  - reemplazar el plan pide confirmación;
  - "Terminar plan";
  - plan en casa de 3 días: todos los días tienen ejercicios y ninguno se repite;
  - migración v5 → v6.
