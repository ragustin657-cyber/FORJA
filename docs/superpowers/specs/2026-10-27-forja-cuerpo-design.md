# FORJA — Progreso corporal: medidas y fotos

**Fecha:** 27 de octubre de 2026
**Base:** amplía la sección 7.5 de `2026-10-26-forja-design.md`. El peso, con gráfico y tendencia, ya existe desde la etapa 2B.
**Estado:** aprobado en la conversación; falta la revisión del documento escrito.

## 1. Alcance

**Incluye:**

- medidas corporales (cintura, pecho, brazo, pierna, cadera y cuello), cada una con su gráfico;
- estimación del % de grasa corporal;
- fotos de progreso en tres poses, sacadas desde una cámara propia con "foto fantasma" y temporizador, o elegidas de la galería;
- comparación entre dos fechas, lado a lado o con deslizador;
- recordatorio en Inicio cada 2 semanas;
- fotos en la copia de seguridad, de forma opcional.

**Fuera de alcance:**

- análisis de las fotos con IA;
- medidas separadas de izquierda y derecha;
- pantorrilla.

## 2. Decisiones de Agustín

- Las fotos se sacan de varias maneras: selfie en el espejo, con el iPhone apoyado y temporizador, o que las saque otra persona. Por eso la cámara permite usar la cámara frontal o la trasera, temporizador y galería.
- Opción A de cámara: cámara propia de FORJA con la foto anterior semitransparente encima, más "Elegir de la galería".
- Medidas: las 5 originales más el cuello, con % de grasa estimado.

## 3. Pantalla Progreso

Arriba aparece la sección **Cuerpo**, con tres tarjetas en este orden. Debajo siguen los ejercicios, como hoy.

1. **Peso corporal:** la tarjeta de la etapa 2B, sin cambios.
2. **Medidas:**
   - Muestra los últimos valores, cada uno con su diferencia contra el registro anterior ("Cintura 84 cm · −1,5").
   - Debajo, el **% de grasa estimado**, si se puede calcular.
   - Un selector de medida (chips) con su gráfico, que necesita al menos 2 registros de esa medida.
   - Botón **"Cargar medidas"**.
   - Sin registros, la tarjeta muestra una explicación breve y el botón.
3. **Fotos:**
   - Una grilla por fecha, de la más nueva a la más vieja. Cada fecha muestra las miniaturas de las poses que tenga; las que falten aparecen como un recuadro vacío.
   - Botones **"Sacar fotos"** y **"Comparar"**. "Comparar" solo está disponible si hay al menos 2 fechas con fotos.
   - Tocar una fecha abre esa fecha: las fotos grandes, se puede deslizar entre poses, y hay un botón para borrar cada foto.

## 4. Medidas

- **Formulario "Cargar medidas":**
  - fecha (por defecto hoy, se puede cambiar a un día pasado);
  - seis campos en cm, todos opcionales, aunque al menos uno tiene que estar completo;
  - cada campo viene precargado vacío y muestra como ayuda el último valor ("antes: 84").
- **Guía de cómo medir:** un texto corto debajo de cada campo:
  - cintura a la altura del ombligo, relajado;
  - pecho a la altura de las tetillas;
  - brazo en la parte más ancha, relajado;
  - pierna en la parte más ancha del muslo;
  - cadera en la parte más ancha de los glúteos;
  - cuello debajo de la nuez.
- **Validación:** cada medida entre 15 y 250 cm (el cuello entre 20 y 70), con coma o punto decimal.
- **Un registro por día:** si ya hay uno ese día, se combina: los campos nuevos reemplazan y los vacíos conservan lo que había.
- **Borrar:** desde el detalle del gráfico se puede borrar un registro.

### 4.1 % de grasa estimado

Fórmula de la Marina de EE. UU. (medidas en cm, log en base 10):

- **Hombre:** `495 / (1,0324 − 0,19077·log(cintura − cuello) + 0,15456·log(altura)) − 450`
- **Mujer:** `495 / (1,29579 − 0,35004·log(cintura + cadera − cuello) + 0,22100·log(altura)) − 450`

**Cuándo se calcula:**

- Se usa el último registro que tenga las medidas necesarias: cintura y cuello, y también cadera en mujeres.
- El sexo y la altura salen de "Mi plan". Si no hay plan, se muestra "Armá tu plan para estimar tu % de grasa".
- Si la cintura es igual o menor que el cuello, o el resultado queda fuera de 2–60 %, no se muestra.

**Cómo se muestra:** con un decimal y el aviso "Estimación: puede variar ±3–4 % respecto de una medición profesional". Hay una línea de evolución si hay 2 o más estimaciones.

## 5. Fotos

### 5.1 Sacar fotos

"Sacar fotos" abre la pantalla de cámara:

- **Pose:** chips Frente / Perfil / Espalda. Las poses que todavía no tienen foto hoy aparecen primero. Al guardar una, se pasa sola a la siguiente que falte.
- **Cámara:** con `getUserMedia`, en vertical, con resolución ideal de 1440×1920. Arranca con la cámara trasera.
  - Un botón cambia entre la frontal y la trasera.
  - Con la frontal, la vista previa se ve en espejo, como en un espejo, pero la foto se guarda sin espejar.
- **Foto fantasma:**
  - Encima de la vista previa se muestra la última foto de esa pose al 35 % de opacidad. Con la cámara frontal se espeja igual que la vista previa, para alinear.
  - Un botón la oculta o la muestra.
  - Si no hay foto anterior, se muestra una silueta guía genérica en SVG.
- **Temporizador:** chips 0 / 5 / 10 s. Por defecto está en 0, y la app recuerda la última elección.
  - Con 5 o 10, se muestra una cuenta regresiva grande y suena un pitido por segundo, reutilizando el sonido del temporizador de descanso.
  - Tocar la pantalla cancela la cuenta.
- **Al disparar:** se muestra la foto con **"Usar foto"** y **"Repetir"**.
- **Galería:** el botón "Elegir de la galería" (`<input type="file" accept="image/*">`) sirve para fotos que sacó otra persona o que se sacaron con la cámara normal. Respeta la orientación de la foto (EXIF).
- **Fecha:** por defecto hoy, y se puede cambiar a un día pasado para cargar fotos viejas.
- **Una foto por pose y fecha:** si ya existe, se pregunta "Ya hay una foto de frente de ese día. ¿Reemplazarla?".
- **Sin cámara o con el permiso denegado:** se muestra un aviso y queda disponible "Elegir de la galería".
- **Apagado de la cámara:** se apaga al salir de la pantalla y cuando la app pasa a segundo plano. Al volver, se reactiva.

### 5.2 Guardado

- **Imagen:** JPEG de calidad 0,82, con el lado largo de 1600 px como máximo; pesa unos 200 KB.
- **Miniatura:** JPEG de 320 px.
- **Permiso de almacenamiento:** al guardar la primera foto se pide `navigator.storage.persist()`, para que iOS no la borre si le falta espacio.
- **Si el guardado falla** (por ejemplo, por falta de espacio): aparece el aviso "No se pudo guardar la foto. Liberá espacio en el iPhone" y no se pierde ningún dato anterior.

### 5.3 Comparar

- **Selección:** una pose y dos fechas (por defecto, la primera y la última con esa pose).
- **Lado a lado:** las dos fotos, cada una con su fecha y su peso de ese día si lo hay ("12/10 · 80 kg").
- **Deslizador:** una foto encima de la otra con un divisor vertical que se arrastra.
- Si una de las fechas no tiene esa pose, se muestra "No hay foto de perfil del 12/10".

## 6. Recordatorio en Inicio

**Tarjeta "Fotos de progreso":** aparece si pasaron 14 días o más desde la última foto, o si nunca se sacó una. En ese caso dice "Sacá tus primeras fotos para ver tu cambio".

- **Sacar fotos:** abre la cámara.
- **Medidas:** un enlace a "Cargar medidas".
- **Ahora no:** oculta la tarjeta por 3 días. La fecha se guarda en Ajustes.

## 7. Copia de seguridad

- **Exportar:** pregunta "¿Incluir fotos?", con el tamaño aproximado.
  - Con fotos, el `.zip` lleva `fotos/<id>.jpg` y `fotos/<id>-mini.jpg`, y la tabla de fotos va en `datos.json`.
  - Sin fotos, no lleva ni las imágenes ni la tabla de fotos.
- **Formato:** `VERSION_FORMATO` pasa a 2. Se siguen aceptando copias de la versión 1.
- **Resumen antes de restaurar:** muestra la cantidad de fotos que trae la copia.
- **Restaurar:**
  - Si la copia trae fotos, las fotos actuales se reemplazan.
  - Si no trae fotos, **las fotos del iPhone se conservan** y el resumen lo dice ("Esta copia no tiene fotos: se conservan las que ya tenés").
  - Una foto sin su imagen en el `.zip` se descarta.

## 8. Datos

| Tabla | Campos |
|---|---|
| medidas | id (AAAA-MM-DD), fecha (ms), cintura?, pecho?, brazo?, pierna?, cadera?, cuello? (cm) |
| fotos | id (`AAAA-MM-DD-pose`), fecha (AAAA-MM-DD), pose ('frente' / 'perfil' / 'espalda'), creado |
| imagenes | id (el mismo de la foto), imagen (Blob JPEG), miniatura (Blob JPEG) |

- Las imágenes van en una tabla aparte para que listar fotos no cargue los archivos.
- La base pasa a la **versión 4**.
- El repositorio `cuerpoRepo` borra la foto y su imagen en una misma operación.
- En Ajustes se suman `temporizadorFoto` (0, 5 o 10) y `fotosPospuestas` (fecha).

## 9. Lógica (core, cobertura del 100 %)

- `grasaCorporal(sexo, alturaCm, medidas)`: un número o null, cubriendo cada condición de 4.1.
- `validarMedidas` y `combinarMedidas`.
- `ultimasMedidas`: el último valor de cada medida y su diferencia.
- `serieDeMedida`: los puntos de una medida para el gráfico.
- `necesitaFotos(ultimaFoto, pospuestas, ahora)`.
- `fotosPorFecha` (la grilla) y `paresParaComparar` (las fechas por defecto).
- `medidasEscaladas(ancho, alto, max)`: el tamaño de la imagen guardada y de la miniatura.

## 10. Pruebas

- **Unitarias:**
  - cada función de la sección 9;
  - el repositorio (combinar por día, borrar foto e imagen juntas);
  - la copia con y sin fotos;
  - la restauración que conserva las fotos;
  - leer una copia de la versión 1.
- **Navegador (Playwright, iPhone 13):**
  - cargar medidas y ver el % de grasa;
  - el gráfico de una medida;
  - sacar foto con cámara simulada (flags de Chromium con video falso, como en la etapa 2B);
  - el temporizador de 5 s con reloj simulado;
  - elegir de la galería;
  - reemplazar una foto;
  - la grilla;
  - comparar lado a lado y con deslizador;
  - borrar;
  - el recordatorio en Inicio y "Ahora no";
  - actualizar la base de v3 a v4 sin perder datos;
  - la copia de seguridad con fotos, de ida y vuelta.
- **Manual en el iPhone:**
  - la cámara frontal y la trasera;
  - la foto fantasma;
  - el temporizador con el iPhone apoyado;
  - una foto de la galería sacada en vertical.
