# FORJA

Tu entrenador personal en el iPhone: rutinas, registro de series, progresión de pesos, récords y gráficos de fuerza.
Funciona sin internet y guarda todo en tu teléfono.

## Instalarla en el iPhone

1. Abrí la dirección de la app en **Safari** (tiene que ser Safari).
2. Tocá **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elegí **Agregar a inicio** y confirmá.
4. Abrí FORJA desde el ícono nuevo de tu pantalla de inicio.

Desde el ícono, la app funciona sin conexión y el iPhone conserva tus datos.

## Tus datos

Todo queda guardado solo en tu iPhone. Una vez por mes hacé una copia en **Más → Copia de seguridad** y guardala en Archivos o iCloud Drive.
Con esa copia recuperás todo si cambiás de teléfono.

## Para desarrollo

- `npm run build` — construye la app en `dist/`.
- `npm test` — pruebas de la lógica (con Bun).
- `npm run e2e` — pruebas en un navegador con tamaño de iPhone (Playwright).
- `npm run verificar` — tipos, cobertura y pruebas de navegador.
- `node scripts/importar-ejercicios.mjs <carpeta>` — reimporta la base de ejercicios desde un clon de
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db). Ver `LICENCIAS.md`.

Cada push a `main` publica la app en GitHub Pages (`.github/workflows/deploy.yml`).

Forja da recomendaciones generales de entrenamiento basadas en fórmulas estándar. No reemplaza a un médico, nutricionista o entrenador matriculado.
