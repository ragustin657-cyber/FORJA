# FORJA — Nutrición, etapa 2A: tu plan y menú semanal

**Fecha:** 26 de octubre de 2026
**Base:** amplía la sección 7.4 de `2026-10-26-forja-design.md`. Lo que no se dice acá sigue lo que dice ese documento.
**Estado:** borrador para revisión

## 1. Alcance

**Entra en esta etapa:**

- Perfil nutricional.
- Cálculo de calorías y macros.
- Base de platos.
- Menú semanal con cambio de platos.
- Lista de compras.
- Detalle de cada plato.

**Queda para la etapa 2B:**

- Registro de comidas (código de barras, menú, carga manual).
- Anillos de calorías y proteína en Inicio.
- Recordatorio de peso semanal.
- Ajuste automático cada 2 semanas.

## 2. Mi plan (perfil)

Se carga desde la pestaña Nutrición la primera vez, y después se edita desde "Mi plan".

| Dato | Detalle |
|---|---|
| Sexo | hombre / mujer (para la fórmula) |
| Fecha de nacimiento | la edad se calcula sola |
| Altura | cm, entre 120 y 230 |
| Peso actual | kg, entre 35 y 250, con coma decimal; se guarda en el historial de peso con la fecha |
| Actividad | sedentario (1,2), liviano (1,375), moderado (1,55), alto (1,725), muy alto (1,9), cada uno con un ejemplo |
| Objetivo | bajar grasa (−20 %), mantener, ganar músculo (+10 %) |
| Comidas por día | 3, 4 o 5; 4 por defecto |
| No como | chips por grupo (carne vacuna, cerdo, pollo, pescado, lácteos, huevo, gluten) y texto libre por ingrediente |

Valores fuera de rango bloquean el guardado con un mensaje claro. La primera vez se muestra el aviso de salud de la sección 15.

## 3. Tus números

- **Fórmula:** Mifflin-St Jeor × factor de actividad × ajuste por objetivo.
- **Topes de seguridad** (sección 7.4 del documento base):
  - Mínimo de calorías: el mayor entre el metabolismo basal y 1.500 kcal (hombres) o 1.200 kcal (mujeres).
  - Pérdida máxima: 1 % del peso por semana.
- **Macros:**
  - Proteína: 2 g/kg, o 1,8 g/kg para mantener.
  - Grasas: 25 % de las calorías, con un mínimo de 0,6 g/kg.
  - Carbohidratos: el resto.
- **Redondeo:** calorías a la decena, gramos al entero.
- **Explicación:** debajo de cada número, una línea que dice cómo se calculó. Por ejemplo: "Tu cuerpo gasta unas 2.650 kcal por día; para bajar grasa comés un 20 % menos".

## 4. Base de platos

- Unos 70 platos de comida argentina común, repartidos así:
  - desayuno y merienda: ~25
  - almuerzo y cena: ~35
  - colaciones: ~10
- Cada plato tiene:
  - nombre;
  - tipo de comida (puede servir para más de uno);
  - ingredientes con gramos para una porción base;
  - 2 a 4 pasos de preparación;
  - los grupos que contiene (para "no como").
- Una tabla propia de unos 120 alimentos con macros cada 100 g, de valores de referencia estándar y aproximados, con la categoría de compra (verdulería, carnicería, almacén, lácteos, panadería, otros) y una unidad práctica para la lista ("1 huevo = 50 g").
- Las macros de un plato se calculan sumando sus ingredientes. Nunca se cargan a mano, así no hay inconsistencias.

## 5. Menú semanal

**Reparto de calorías por comida:**

| Comidas | Reparto |
|---|---|
| 3 | desayuno 30 %, almuerzo 35 %, cena 35 % |
| 4 | desayuno 25 %, almuerzo 30 %, merienda 15 %, cena 30 % |
| 5 | desayuno 20 %, colación 10 %, almuerzo 30 %, merienda 15 %, cena 25 % |

**Cómo se elige cada plato:**

- Se elige al azar entre los del tipo de comida, con una semilla para poder repetir el mismo resultado.
- Se descartan los que tienen algo de "no como".
- Ningún plato se repite más de 2 veces en la semana.

**Porción:** el plato se escala con un factor de 0,5 a 2,5 para llegar a las calorías de esa comida. Si el día queda fuera de ±5 % de las calorías, se reajustan los factores. Entre platos posibles, se prefiere el que deja la proteína del día más cerca del objetivo.

**Cambiar un plato:** se ofrecen hasta 5 alternativas del mismo tipo de comida, ordenadas por cercanía en calorías y proteína ya escaladas.

**Rehacer la semana:** genera todo de nuevo con otra semilla.

**Cuándo se rehace solo:** el menú se guarda por semana. Si cambia el perfil, se pregunta si rehacerlo.

## 6. Lista de compras

- Suma los gramos de cada alimento de toda la semana y los agrupa por categoría.
- Muestra unidades prácticas cuando existen ("6 huevos (300 g)").
- Cada ítem tiene una casilla para tacharlo, que se guarda.

## 7. Pantallas

- **Nutrición:**
  - Si no hay perfil: bienvenida con botón para armar el plan.
  - Si hay perfil:
    - tarjeta "Tus números";
    - menú de hoy;
    - accesos a la semana completa, la lista de compras y Mi plan.
- **Semana:** pestañas Lun–Dom; cada comida con su plato, gramos totales, kcal y proteína; botón "Cambiar".
- **Plato:** ingredientes escalados en gramos, pasos y macros.
- **Lista de compras:** grupos con casillas.

## 8. Datos nuevos

| Entidad | Campos |
|---|---|
| PerfilNutricional | sexo, nacimiento, altura, actividad, objetivo, comidas, noComo[] (id fijo 'yo') |
| RegistroPeso | id, fecha, kg |
| MenuSemanal | id (lunes de la semana, AAAA-MM-DD), semilla, perfilHash, días: 7 × comidas: { tipo, platoId, factor } |
| ListaCompras | id (la semana), tachados: alimentoId[] |

Las tablas nuevas entran solas en la copia de seguridad, porque la copia recorre todas las tablas. La versión de la base de datos sube a 2.

## 9. Pruebas

- **Lógica:** 100 % de cobertura en las unidades nuevas de `core/nutricion/`:
  - calorías y topes;
  - macros;
  - escalado;
  - armado del menú (reparto, ±5 %, sin repetir más de 2 veces, "no como");
  - alternativas;
  - lista de compras;
  - validación del perfil.
- **Datos:** todos los platos de la base usan alimentos que existen y tienen al menos un tipo de comida. Cada combinación de "no como" de un solo grupo deja al menos 3 platos por tipo de comida.
- **Navegador:**
  - cargar el perfil;
  - ver los números;
  - ver el menú de hoy;
  - cambiar un plato;
  - tachar un ítem de la lista y que siga tachado al recargar.

## 10. Aviso

Los valores son aproximados y las recomendaciones son generales. La app lo dice en "Tus números" y en el aviso de salud.
