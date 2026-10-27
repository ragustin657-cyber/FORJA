# Licencias de contenido de terceros

## Base de ejercicios

Los datos y las imágenes de ejercicios (`src/contenido/ejercicios.json`, `public/ejercicios/`, `public/ejercicios-extra/`)
provienen de [free-exercise-db](https://github.com/yuhonas/free-exercise-db), publicada en dominio público bajo
[The Unlicense](https://unlicense.org). Las imágenes se redujeron y convirtieron a WebP. Los nombres e instrucciones en español
(`src/contenido/traducciones-es.json`) son propios de FORJA.

## Lector de códigos de barras

`vendor/zxing.js` es una versión reducida (solo códigos de productos) de [ZXing para JavaScript](https://github.com/zxing-js/library)
v0.23.0, publicada bajo la [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). Se genera con
`scripts/vendor-zxing.mjs` a partir de un clon de ese repositorio, sin modificar su código.

## Datos de productos envasados

Los datos de productos que se buscan por código de barras vienen de [Open Food Facts](https://world.openfoodfacts.org),
publicados bajo la [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). Cada producto se guarda en el teléfono
para usarlo sin internet.
