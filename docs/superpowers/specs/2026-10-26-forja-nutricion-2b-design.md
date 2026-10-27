# FORJA — Nutrición, etapa 2B: el día a día

**Fecha:** 26 de octubre de 2026
**Base:** amplía la sección 7.4 de `2026-10-26-forja-design.md` y la etapa 2A (`2026-10-26-forja-nutricion-2a-design.md`).
**Estado:** borrador para revisión

## 1. Alcance

**Incluye:**

- Registro de lo que comés, partiendo del menú o en forma libre (decisión C de Agustín).
- Productos por código de barras.
- Anillos de calorías y proteína en Inicio.
- Recordatorio y gráfico de peso.
- Ajuste automático cada 2 semanas.

**Fuera de alcance:**

- Fotos de platos con IA (descartado).
- Medidas y fotos corporales (fase de progreso corporal).

## 2. Registro del día ("Hoy")

Es una pantalla nueva, a la que se llega desde Nutrición y desde los anillos de Inicio.

- **Navegación:** flechas para ir al día anterior y al siguiente, hasta hoy. Por defecto abre en hoy.
- **Comidas:** una tarjeta por comida del perfil (3, 4 o 5).
- **Plato del menú:**
  - Si el día pertenece a una semana con menú, se muestra el plato de esa comida con el botón **"La comí"** y las porciones **½, 1 o 1½**.
  - "La comí" registra el plato con `factor del menú × porción`.
  - Si ya está registrado, el botón pasa a **"Registrado ✓"** y se puede quitar.
- **Agregar:** cada comida tiene "Agregar", que abre cuatro pestañas:
  - **Recientes:** los últimos 20 ítems distintos registrados, de un toque.
  - **Platos:** búsqueda en la base de platos, con porción ½ a 2.
  - **Alimentos:** búsqueda en la tabla de alimentos y en los productos guardados, con gramos.
  - **Código de barras:** ver la sección 3.
- **Ítems registrados:** cada uno muestra nombre, cantidad, kcal y proteína, y se puede borrar.
- **Total del día:** "1.840 de 2.210 kcal · 120 de 160 g proteína", con barras.
- **Historial fijo:** cada registro guarda una copia de sus macros al momento de registrarlo. Si después cambia el contenido de la app, el historial no se altera.

## 3. Código de barras

- **Lector:** la cámara trasera (`getUserMedia`, `facingMode: environment`) analiza un cuadro cada 200 ms con ZXing, buscando solo formatos de producto: EAN-13, EAN-8, UPC-A y UPC-E.
  - ZXing es una librería libre (Apache 2.0) que se incluye en la app; se registra en `LICENCIAS.md`.
  - Al leer un código, la cámara se apaga y vibra si el teléfono lo permite.
- **Sin cámara o con permiso denegado:** se muestra "No pudimos usar la cámara. Escribí el número que está debajo de las barras". Escribir el número siempre está disponible.
- **Búsqueda del producto:**
  1. Primero en los productos guardados en el iPhone.
  2. Después en Open Food Facts: `GET https://world.openfoodfacts.org/api/v2/product/{código}?fields=product_name,brands,nutriments,serving_quantity`, con un tiempo máximo de 8 s.
  - Se usan `energy-kcal_100g` (o `energy_100g` / 4,184), `proteins_100g`, `fat_100g` y `carbohydrates_100g`.
  - Si faltan las kcal o las tres macros, se considera "sin datos".
- **Encontrado:** se muestra nombre y marca con los valores cada 100 g. Elegís los gramos (si se conoce la porción del envase, viene precargada) y se registra. El producto queda guardado para usarlo sin internet.
- **No encontrado, sin datos o sin internet:** formulario "Cargá los datos de la etiqueta" con nombre, kcal, proteínas, grasas y carbohidratos cada 100 g, más los gramos consumidos. Se valida que los valores sean de 0 a 900 kcal y de 0 a 100 g, y que las macros no superen 100 g. Queda guardado con ese código.

## 4. Inicio

- **Anillos:** si hay perfil, una tarjeta con dos anillos, calorías y proteína (consumido / meta del día). Si se pasa de la meta, el anillo de calorías se marca en bordó claro. Tocar la tarjeta lleva a "Hoy".
- **Recordatorio de peso:** si el último peso tiene 7 días o más, aparece la tarjeta "Toca pesarte", con un campo de kg y el botón Guardar. Se guarda como registro de peso del día.

## 5. Peso en Progreso

- Tarjeta "Peso corporal" con un gráfico de línea de los registros y la tendencia (promedio móvil de 7 días). Con menos de 2 registros, muestra un mensaje para cargar más.

## 6. Ajuste cada 2 semanas

**Ajuste guardado:** el perfil suma `ajusteKcal` (por defecto 0, en múltiplos de 150) y `ultimoAjuste` (una fecha). `calcularMetas` aplica el ajuste a las calorías buscadas **antes** de los topes de seguridad, que siguen siendo los mismos.

**Cuándo se propone:**

- hay pesos que abarcan al menos 28 días;
- pasaron 14 días o más desde `ultimoAjuste` (o nunca hubo uno).

**Cálculo:**

- A = promedio de los pesos de los últimos 14 días.
- B = promedio de los pesos de los 14 días anteriores.
- El cambio semanal es `(A − B) / 2`, expresado como porcentaje del peso actual: `cambio% = (A − B) / 2 / A × 100`.

| Objetivo | Propone −150 kcal si… | Propone +150 kcal si… |
|---|---|---|
| Bajar | cambio% > −0,25 (baja más lento) | cambio% < −1 (baja demasiado rápido) |
| Mantener | cambio% > +0,25 | cambio% < −0,25 |
| Ganar | cambio% > +0,5 | cambio% < +0,1 |

**Sin cambios:** si no corresponde ningún ajuste, no se muestra nada, pero se registra la fecha del chequeo para no evaluar de nuevo hasta 14 días después.

**La tarjeta en Nutrición:** "Revisamos tu progreso: bajaste 0,1 kg por semana, más lento de lo buscado. Te proponemos 150 kcal menos por día (de 2.210 a 2.060)", con los botones **Aplicar** y **Ahora no**.

- **Aplicar:** guarda el ajuste. El menú queda marcado como desactualizado (se aplica la lógica de "Tu plan cambió" de la etapa 2A).
- **Ahora no:** solo actualiza `ultimoAjuste`.
- El ajuste nunca puede llevar las calorías por debajo de los topes; si no se mueven, no se propone.

## 7. Datos

| Tabla | Campos |
|---|---|
| registros | id, fecha (AAAA-MM-DD), tipo (comida), origen ('menu' / 'plato' / 'alimento' / 'producto'), refId, cantidad (factor o gramos), nombre, macros {kcal, proteina, grasas, carbos}, creado |
| productos | id (código de barras, o "propio-…"), nombre, marca?, kcal, proteina, grasas, carbos (cada 100 g), porcionG?, origen ('off' / 'manual') |

Además, el perfil suma `ajusteKcal` y `ultimoAjuste`. La base pasa a la **versión 3**. Las copias de seguridad incluyen las tablas nuevas solas.

## 8. Pruebas

- **Lógica, con 100 % de cobertura:**
  - macros de un registro y totales del día;
  - recientes;
  - interpretación de la respuesta de Open Food Facts;
  - validación de la etiqueta;
  - recordatorio de peso;
  - promedio móvil;
  - propuesta de ajuste (cada fila de la tabla, más los casos de "sin datos suficientes" y "tope");
  - decodificación de un EAN-13 generado.
- **Navegador:**
  - "La comí" suma en el total y en los anillos;
  - agregar un alimento con gramos;
  - código escrito a mano con Open Food Facts simulado (encontrado / no encontrado / sin internet);
  - recordatorio de peso;
  - gráfico de peso;
  - tarjeta de ajuste con pesos cargados;
  - actualización de la base v2 → v3 sin perder datos.
- **Manual en el iPhone:** escanear un producto real con la cámara.
