# FORJA — Documento de diseño

**Fecha:** 26 de octubre de 2026
**Autor del pedido:** Agustín
**Estado:** borrador para revisión

---

## 1. Resumen

FORJA es una app de entrenamiento y nutrición para usar en el iPhone, sobre todo en el gimnasio. Junta en un solo lugar:

- el registro de rutinas, pesos y repeticiones, con progresión y proyección de fuerza;
- planes de entrenamiento de 12 semanas según objetivo, o rutinas armadas a mano;
- una biblioteca de ejercicios con imágenes;
- un plan de alimentación semanal calculado según peso, altura y objetivo, con registro de comidas;
- el seguimiento del cuerpo con peso, medidas y fotos de progreso.

**Etapa actual:** uso personal, para probarla un tiempo. Si funciona bien, el plan es ofrecerla a otras personas. El diseño de esta etapa no incluye cuentas ni servidores, pero se deja ordenado para poder sumarlos después sin rehacer la app.

## 2. Objetivos y criterios de éxito

**Lo que tiene que lograr esta versión:**

1. Registrar un entrenamiento completo en el gimnasio con una mano, sin trabas y sin internet.
2. Decir con claridad cuándo subir el peso en cada ejercicio, y mostrar la evolución con gráficos.
3. Calcular calorías y macros con fórmulas estándar y armar un menú semanal con comidas argentinas comunes.
4. Llevar un registro del cuerpo con peso, medidas y fotos comparables en el tiempo.
5. Que nunca se pierdan los datos, gracias a una copia de seguridad fácil de hacer y de restaurar.

**Cómo sabemos que funciona:** Agustín la usa en cada entrenamiento durante al menos 4 semanas sin volver a su método anterior. Además, los cálculos (progresión, calorías, macros, proyecciones) pasan todas sus pruebas automáticas.

## 3. Fuera de alcance en esta etapa

- Cuentas de usuario, nube, sincronización entre dispositivos.
- Análisis de fotos de platos con IA (descartado por decisión de Agustín).
- Videos propios grabados desde la app.
- Publicación en App Store o Play Store.
- Funciones sociales, como compartir o tener amigos.
- Integración con Apple Salud o relojes.

## 4. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Uso | Personal; ofrecerla después si funciona |
| Dispositivo | iPhone, sobre todo en el gimnasio |
| Tipo de app | App web instalable (PWA), que se agrega al inicio desde Safari |
| Datos | Guardados solo en el iPhone, con copia de seguridad exportable |
| Dietas y planes | Reglas fijas dentro de la app, más un botón opcional de IA (Claude) |
| Ejercicios | Base libre de ejercicios con imágenes, incluida en la app |
| Rutinas | Dos opciones: armarlas a mano o generar un plan, siempre editable |
| Registro de comidas | Código de barras, platos del menú o favoritos, y carga manual |
| Colores | Bordó y dorado sobre fondo oscuro |
| Nombre | FORJA (en mayúsculas en el logo, "Forja" en textos) |

## 5. Arquitectura técnica

### 5.1 Tecnología

- **Lenguaje y marco:** TypeScript + React, armado con Vite.
- **App instalable y sin conexión:** PWA con *service worker* (plugin `vite-plugin-pwa`), que guarda la app y la base de ejercicios en el celular para funcionar sin internet.
- **Base de datos local:** IndexedDB a través de la librería Dexie. Ahí se guardan también las fotos de progreso, comprimidas.
- **Gráficos:** una librería liviana de gráficos para React (por ejemplo Recharts).
- **Lectura de código de barras:** librería ZXing para la cámara, porque Safari en iPhone no trae lector de códigos propio.
- **Publicación:** hosting estático gratuito (por ejemplo GitHub Pages o Vercel).
- **Pruebas:** Vitest para la lógica, y pruebas de componentes para las pantallas clave.

### 5.2 Organización del código

La lógica de cálculo va separada de las pantallas, para que se pueda probar sola y reusar si después se hace una versión en la nube.

```
src/
  core/            ← lógica pura, sin pantallas (100% probada)
    progresion/    ← doble progresión, fuerza máxima estimada, récords
    proyeccion/    ← proyección de fuerza a 1, 3 y 6 meses
    planes/        ← generador de planes de 12 semanas
    nutricion/     ← calorías, macros, armado del menú, ajuste quincenal
    unidades/      ← redondeos de peso y porciones
  data/            ← base de datos local (Dexie) y repositorios
    db.ts
    repos/         ← un archivo por entidad (rutinas, sesiones, comidas...)
    backup/        ← exportar y restaurar copia de seguridad
  contenido/       ← base de ejercicios y base de platos (archivos de datos)
  ia/              ← cliente opcional de la API de Claude
  ui/
    tema/          ← colores, tipografía, componentes base
    pantallas/     ← inicio, entrenar, nutricion, progreso, mas
```

**Regla de diseño:** las pantallas nunca tocan la base de datos directamente; siempre pasan por los repositorios en `data/repos`. Así, el día que se sume la nube, solo se cambia esa capa.

### 5.3 Persistencia en iPhone

- Al abrir la app instalada se pide almacenamiento persistente (`navigator.storage.persist()`), para que iOS no borre los datos.
- Si la app se usa desde Safari sin instalar, aparece un aviso que explica cómo agregarla al inicio y por qué conviene hacerlo.
- Una vez por mes aparece un recordatorio de copia de seguridad.

## 6. Modelo de datos

| Entidad | Campos principales |
|---|---|
| **Perfil** | nombre, sexo, fecha de nacimiento, altura, nivel de actividad, objetivo, nivel de entrenamiento, alimentos que no come |
| **Ejercicio** | id, nombre (es), nombre original, músculos, equipo, tipo (tren superior / inferior), imágenes, instrucciones, favorito, es propio |
| **Rutina** | id, nombre, origen (manual / plan), lista de días |
| **DíaDeRutina** | nombre, ejercicios ordenados, cada uno con series objetivo, rango de repeticiones y descanso |
| **Plan** | id, objetivo, nivel, días por semana, equipo, fecha de inicio, 12 semanas con su bloque y marca de descarga |
| **Sesión** | id, fecha, día de rutina, duración, series realizadas |
| **Serie** | ejercicio, número, peso, repeticiones, completada |
| **RegistroCorporal** | fecha, peso, medidas (cintura, pecho, brazo, pierna, cadera) |
| **FotoProgreso** | fecha, pose (frente / perfil / espalda), imagen comprimida |
| **ObjetivoNutricional** | fecha, calorías, proteína, grasas, carbohidratos |
| **MenúSemanal** | semana, 7 días × 4–5 comidas, cada comida con plato y gramos |
| **Alimento** | id, nombre, macros cada 100 g, código de barras (si tiene), origen (base / escaneado / manual) |
| **Plato** | id, nombre, ingredientes con gramos, tipo de comida (desayuno, almuerzo, etc.), favorito |
| **RegistroComida** | fecha, tipo de comida, plato o alimento, gramos, macros calculados |
| **Ajustes** | unidades, modelo de IA, clave de API (opcional), recordatorios |

## 7. Módulos

### 7.1 Entrenamiento

**Rutinas manuales:** se crean días, se eligen ejercicios de la biblioteca y se define para cada uno la cantidad de series, el rango de repeticiones (por ejemplo 8–12) y el descanso.

**Sesión en el gimnasio:**
- Cada ejercicio muestra lo hecho la última vez ("la vez pasada: 60 kg × 10, 10, 9").
- El peso y las repeticiones vienen precargados con la sugerencia de progresión, y se ajustan con botones grandes de + y −.
- Al marcar una serie como completada arranca el temporizador de descanso, que avisa con vibración o sonido al terminar.
- Al finalizar, la sesión se guarda en el historial y se muestran los récords nuevos.
- Si la app se cierra en medio de una sesión, al volver se retoma donde quedó.

**Regla de progresión (doble progresión):**
- Si en la sesión anterior se completaron **todas** las series en el **tope** del rango, se sugiere subir el peso: **+2,5 kg en tren superior y +5 kg en tren inferior**.
- Si no, se sugiere mantener el peso e intentar sumar repeticiones.
- Si el rendimiento cae dos sesiones seguidas, se sugiere bajar un 10 % el peso y volver a construir.
- Los pesos se redondean al incremento disponible más cercano (2,5 kg por defecto, configurable).

**Fuerza máxima estimada (1RM):** se calcula con la fórmula de Epley, **1RM = peso × (1 + repeticiones / 30)**, usando la mejor serie de cada sesión. Solo se usan series de 1 a 15 repeticiones (el tope de los planes para bajar grasa), porque por encima la fórmula pierde demasiada precisión.

**Récords personales:** mayor 1RM estimado, mayor peso levantado y mayor cantidad de repeticiones con un mismo peso. Se destacan en dorado.

**Proyección "hasta dónde podés llegar":**
- Requiere al menos 4 sesiones del ejercicio en un período de 3 semanas o más. Si no hay suficientes datos, se muestra un mensaje que lo explica.
- Se ajusta una curva logarítmica (1RM = a + b · ln(días + 1)) al historial de 1RM estimado. Esta forma refleja que la fuerza sube rápido al principio y después se frena.
- Se muestran los valores proyectados a 1, 3 y 6 meses, con un rango de incertidumbre.
- Hay un tope de prudencia: la proyección mensual no puede superar el ritmo típico del nivel de entrenamiento (principiante ~5 %, intermedio ~2 %, avanzado ~1 % por mes).
- Siempre se aclara que es una estimación.

### 7.2 Planes a largo plazo

**Entradas:** objetivo (ganar músculo, ganar fuerza, bajar grasa, forma general), nivel, días por semana (3 a 6) y equipo disponible (gimnasio completo, mancuernas, casa).

**Estructura según los días:**
- 3 días: cuerpo completo.
- 4 días: torso / piernas.
- 5–6 días: empuje / tirón / piernas.

**Parámetros según el objetivo:**

| Objetivo | Series por ejercicio | Repeticiones | Descanso |
|---|---|---|---|
| Fuerza | 4–5 | 3–6 en básicos, 6–10 en accesorios | 2–3 min |
| Ganar músculo | 3–4 | 8–12 | 60–90 s |
| Bajar grasa | 3 | 10–15 | 45–60 s |
| Forma general | 3 | 8–12 | 60–90 s |

**Duración:** 12 semanas en 3 bloques de 4. En las semanas 1 a 3 de cada bloque el volumen sube de a poco. La semana 4 es de **descarga**: misma estructura, con un 40 % menos de series y un peso cercano al 90 %.

**Selección de ejercicios:** cada plantilla tiene "huecos" por patrón de movimiento (empuje horizontal, tirón vertical, sentadilla, bisagra de cadera, etc.). Cada hueco se llena con un ejercicio de la biblioteca que coincida con el equipo disponible.

**Resultado:** el plan genera rutinas normales, editables a gusto: se puede cambiar, sacar o agregar ejercicios y mover días. Un calendario muestra en qué semana estás y qué toca hoy.

**Botón de IA (opcional):** permite pedir ajustes al plan en lenguaje natural, por ejemplo por una molestia o por tener poco tiempo. Antes de aplicarlo se muestra el cambio propuesto para aceptarlo o descartarlo.

### 7.3 Biblioteca de ejercicios

- **Fuente:** base libre de ejercicios con imágenes. La candidata es `free-exercise-db`, con unos 800 ejercicios bajo licencia de dominio público. Antes de incluirla se confirma la licencia.
- Las imágenes de la posición inicial y final se incluyen en la app, comprimidas, para que funcionen sin conexión.
- Primero se traducen al español los ~150 ejercicios más comunes, con nombres como se dicen en los gimnasios de Argentina. El resto muestra el nombre original hasta que se traduzca.
- Búsqueda por nombre, filtros por músculo y equipo, favoritos y ejercicios propios.

### 7.4 Nutrición

**Cálculo del gasto diario:**
- Metabolismo basal con la fórmula de **Mifflin-St Jeor**:
  - hombres: 10 × peso + 6,25 × altura − 5 × edad + 5
  - mujeres: 10 × peso + 6,25 × altura − 5 × edad − 161
- Se multiplica por el factor de actividad: sedentario 1,2; liviano 1,375; moderado 1,55; alto 1,725; muy alto 1,9.

**Ajuste según el objetivo:**
- Bajar grasa: −20 % de calorías.
- Mantener: sin cambio.
- Ganar músculo: +10 % de calorías.

**Topes de seguridad:**
- Las calorías nunca bajan del metabolismo basal ni de 1.500 kcal en hombres o 1.200 kcal en mujeres; se usa el mayor de esos valores.
- La pérdida de peso buscada no supera el 1 % del peso corporal por semana.
- Si los datos ingresados dan valores fuera de lo razonable, se avisa y se recomienda consultar a un profesional.

**Macros:**
- Proteína: 2 g por kg de peso corporal (1,8 g/kg si el objetivo es mantener).
- Grasas: 25 % de las calorías, con un mínimo de 0,6 g por kg.
- Carbohidratos: el resto.

**Menú semanal:**
- Base de unos 60–80 platos con comidas argentinas comunes, cada uno con sus ingredientes en gramos y separado por tipo de comida.
- Se arman 7 días de 4 o 5 comidas, repartiendo las calorías del día (por ejemplo: desayuno 25 %, almuerzo 30 %, merienda 15 %, cena 30 %).
- Las porciones de cada plato se escalan para que el día quede dentro de ±5 % de las calorías y lo más cerca posible de la proteína objetivo.
- Se evitan los alimentos marcados como "no como", y el mismo plato no se repite más de 2 veces por semana.
- Cada plato se puede cambiar por otro del mismo tipo de comida con macros equivalentes.
- **Lista de compras:** suma los ingredientes de la semana, agrupados por categoría (verdulería, carnicería, almacén...).
- **Botón de IA (opcional):** permite pedir otra idea de plato con lo que hay en la heladera. El resultado se puede guardar como plato propio.

**Registro de comidas:**
- **Código de barras:** se escanea con la cámara y se buscan los datos en Open Food Facts, la base pública y gratuita de alimentos (requiere internet). Si el producto no está o le faltan datos, se carga a mano una vez y queda guardado para la próxima.
- **Platos del menú o favoritos:** se cargan con un toque, con la porción ajustable.
- **Carga manual:** se elige un alimento y los gramos.
- Después de cada registro se muestra cómo queda el día ("te quedan 45 g de proteína y 600 kcal") y una sugerencia simple basada en reglas, como sumar proteína si falta o avisar si una comida usa gran parte de la grasa del día.

**Ajuste automático cada 2 semanas:**
- Se compara la tendencia de peso (promedio de las últimas 2 semanas contra las 2 anteriores) con el ritmo buscado.
- Si se baja más lento de lo esperado, se restan 150 kcal; si se baja más rápido que el tope, se suman 150 kcal. Al buscar ganar peso se aplica la misma lógica al revés.
- Siempre se respetan los topes de seguridad, y el ajuste propuesto se muestra para confirmarlo antes de aplicarlo.

### 7.5 Progreso corporal

- **Peso:** registro semanal, con gráfico y línea de tendencia (promedio móvil).
- **Medidas:** cintura, pecho, brazo, pierna y cadera, cada una con su gráfico.
- **Fotos:** tres poses (frente, perfil y espalda). La cámara muestra una silueta guía semitransparente para repetir el encuadre, y se recomienda sacarlas con la misma luz y a la misma hora.
- **Comparación:** dos fechas lado a lado, o un deslizador antes/después.
- **Privacidad:** las fotos se guardan solo en el iPhone. Al hacer la copia de seguridad se pregunta si incluirlas.

### 7.6 Inicio

- Entrenamiento de hoy, con botón "Empezar".
- Anillos de calorías y proteína del día (consumido contra objetivo).
- Peso de la semana y su tendencia.
- Últimos récords personales.
- Recordatorios: pesarse (semanal), fotos de progreso (cada 2 semanas) y copia de seguridad (mensual).

### 7.7 Navegación

Barra inferior con 5 pestañas: **Inicio · Entrenar · Nutrición · Progreso · Más**.
"Más" incluye la biblioteca de ejercicios, el perfil, los ajustes, la copia de seguridad y la configuración de IA.

## 8. Diseño visual

- **Fondo:** casi negro con un toque cálido (#141012) y tarjetas un tono más claro (#1E181A).
- **Bordó principal:** #7A1F2B, para botones, elementos activos y encabezados.
- **Bordó claro:** #A8323F, para estados resaltados.
- **Dorado:** #C9A227, para récords, logros, anillos completos y el logo.
- **Texto:** blanco cálido (#F3ECE8) como principal y gris (#A69B97) como secundario.
- **Tipografía:** una sans-serif de trazo firme para títulos y logo, y otra muy legible para números y datos.
- **Logo:** "FORJA" en mayúsculas, dorado sobre bordó.
- **Botones grandes:** mínimo 48 px de alto, con números grandes en la pantalla de sesión, pensados para usar con una mano y sin mirar con detalle.
- Respeta la zona segura del iPhone (muesca y barra inferior).

## 9. IA opcional

- Funciona solo si se carga una clave de API de Anthropic en Ajustes. Sin clave, los botones de IA no aparecen y el resto de la app funciona completo.
- Por defecto usa el modelo más económico de Claude, que se puede cambiar en ajustes. Se recomienda configurar un límite de gasto mensual en la cuenta de API.
- Se usa en dos lugares: ajustes al plan de entrenamiento e ideas de platos.
- Las respuestas de la IA se piden en un formato estructurado y se validan antes de mostrarlas. Si llegan mal o sin internet, aparece un mensaje claro y no se rompe nada.
- **Limitación aceptada para esta etapa:** la clave queda guardada en el iPhone y la app llama a la API directamente. Esto sirve para uso personal, pero **no** para ofrecerla a otros: en esa etapa las llamadas deben pasar por un servidor propio.

## 10. Copia de seguridad

- **Exportar:** genera un archivo `.zip` con los datos y, si se elige, las fotos. Se comparte con la hoja de compartir de iOS para guardarlo en iCloud Drive o Archivos.
- **Restaurar:** se elige el archivo y se muestra un resumen (fecha, cantidad de sesiones, fotos) antes de confirmar. La restauración reemplaza los datos actuales, con un aviso previo.
- El archivo lleva un número de versión del formato, para que copias viejas se puedan restaurar en versiones nuevas de la app.

## 11. Manejo de errores

- **Sin internet:** todo funciona salvo el escaneo de códigos de barras y la IA, que muestran un aviso claro.
- **Producto no encontrado al escanear:** se ofrece cargarlo a mano.
- **Almacenamiento lleno:** se avisa y se sugiere exportar fotos viejas.
- **Datos inválidos** (por ejemplo, un peso de 0 o una altura imposible): se bloquea el guardado con un mensaje que explica el problema.
- **Sesión interrumpida:** se guarda en curso y se ofrece retomarla.

## 12. Pruebas

- **Lógica (`core/`):** pruebas automáticas para la doble progresión, el 1RM, los récords, la proyección (incluido el tope de prudencia), la generación de planes, el cálculo de calorías y macros (incluidos los topes de seguridad), el armado del menú y el ajuste quincenal. El objetivo es cubrir el 100 % de esta carpeta.
- **Datos:** pruebas de que exportar y restaurar devuelve exactamente los mismos datos.
- **Pantallas clave:** pruebas de la sesión de entrenamiento y del registro de comidas.
- **Prueba manual en iPhone:** instalación desde Safari, uso sin conexión, cámara (código de barras y fotos), y conservación de los datos tras cerrar y reabrir la app.

## 13. Orden de construcción

Cada etapa deja algo usable antes de pasar a la siguiente.

1. **Base:** proyecto, tema bordó y dorado, navegación, base de datos, instalación en iPhone y copia de seguridad.
2. **Biblioteca de ejercicios:** importar la base y traducir los primeros 150.
3. **Entrenamiento:** rutinas manuales, sesión, progresión, récords y gráficos.
4. **Proyección** de fuerza.
5. **Progreso corporal:** peso, medidas y fotos.
6. **Nutrición:** perfil, calorías, macros, menú semanal y lista de compras.
7. **Registro de comidas:** código de barras, favoritos, carga manual y ajuste quincenal.
8. **Planes a largo plazo.**
9. **Inicio** completo con resumen y recordatorios.
10. **IA opcional.**

## 14. Camino hacia ofrecerla a otros (no incluido ahora)

Cuando se decida ofrecerla, habrá que sumar:

- cuentas de usuario y datos en la nube, cambiando solo la capa `data/repos`;
- un servidor propio para las llamadas de IA, sin claves en el celular;
- términos de uso y política de privacidad, sobre todo por las fotos corporales y los datos de salud;
- revisar la licencia de la base de ejercicios para uso comercial;
- y evaluar si conviene una app nativa en la App Store.

## 15. Aviso de salud

FORJA da recomendaciones generales de entrenamiento y alimentación basadas en fórmulas estándar. No reemplaza a un médico, nutricionista o entrenador matriculado. La app lo indica en la primera configuración del perfil y en la sección de Nutrición.
