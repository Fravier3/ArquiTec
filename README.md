# ArquiTec

Estudio 3D instalable para arquitectura conceptual y diseño de gabinetes. La interfaz está en español.

## Uso

- Dibuja rectángulos, círculos o polígonos y extrúyelos con Empujar / tirar. Selecciona un objeto para editar medidas, posición, giro y material.
- Inserta un gabinete parametrizado o marca un sólido rectangular como tablero. El plan de corte calcula una distribución aproximada con ancho de sierra y exporta CSV. Admite girar piezas y no controla la veta.
- Los proyectos se guardan automáticamente en IndexedDB en el dispositivo. Usa **Proyectos** para reabrir, importar o exportar un archivo **.arquitec**. Guarda respaldos antes de limpiar datos de sitio o cambiar de dispositivo.
- En iPhone o iPad abre ArquiTec en Safari y elige **Compartir → Añadir a pantalla de inicio**. Después de instalar y precargar los archivos, el modelador funciona sin conexión.
- El visor requiere WebGL 2. Los planos se trazan horizontalmente y se ajustan en el inspector. Esta versión lee y escribe proyectos .arquitec.

## Desarrollo

Requiere Node.js 22.12 o superior.

```sh
npm ci
npm test
npm run dev
npm run build
npm run preview
```

La compilación crea `dist/` con los recursos versionados y un service worker que precarga el conjunto completo. Publica `dist/` en un sitio HTTPS. El proyecto usa Three.js para el visor y Lucide para la iconografía. El motor de modelado y el formato de proyecto son propios de ArquiTec.
