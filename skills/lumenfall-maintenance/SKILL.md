---
name: lumenfall-maintenance
description: Mantenimiento seguro y documentado de juegos Three.js/Vite como Lumenfall. Úsala para auditar proyectos existentes, corregir UI, audio, capas de profundidad, rendimiento o assets, modernizar interfaces con React/Tailwind, actualizar documentación persistente, validar builds y publicar cambios en GitHub.
---

# Mantenimiento de juegos Three.js/Vite

Aplica este flujo cuando el usuario pida modificar un juego existente, corregir un problema visual o de rendimiento, integrar audio/assets, modernizar la interfaz o conservar el historial técnico de un proyecto.

## Principios no negociables

- Conserva la jugabilidad existente y realiza cambios incrementales.
- Lee primero el archivo maestro del proyecto si existe (`LUMENFALL.md`, `PROJECT.md` o equivalente), el `README.md`, el estado de Git y la configuración de build.
- Protege la rama estable. Para cambios grandes crea una rama `feat/...`, `fix/...` o `perf/...`; no reescribas `main` sin validar.
- No inventes resultados visuales. Distingue entre comprobación estática, compilación y prueba visual/manual.
- Respeta las rutas y las mayúsculas de los assets; Linux/Vercel distingue entre `Asset.png` y `asset.png`.
- No añadas audio o imágenes de procedencia dudosa. Registra fuente, licencia y nombre original.

## Flujo secuencial

### 1. Auditar antes de editar

1. Inspecciona la raíz del repositorio y localiza el archivo maestro, documentos, logs, scripts de verificación y carpetas de assets.
2. Ejecuta `git status --short`, identifica la rama y revisa los últimos commits.
3. Lee los archivos relevantes antes de editarlos: entrada HTML, CSS, lógica Three.js, `package.json`, configuración Vite y documentación del proyecto.
4. Convierte la petición del usuario en criterios verificables. Ejemplos: “solo dos sprites visibles”, “sin `alert()`”, “el objeto queda detrás del jugador”, “la compilación termina correctamente”.
5. Si el cambio depende de una pantalla o composición visual, abre una vista local después de levantar el servidor; si la captura no está disponible, informa que la prueba visual no pudo confirmarse.

### 2. Elegir una estrategia de cambio

**Cambio pequeño:** edita el archivo existente con modificaciones específicas y conserva la estructura.  
**Cambio de interfaz grande:** mantén Three.js como motor y migra React/Tailwind por capas: menú, HUD, controles, pausa y diálogos. No reemplaces de golpe el render loop, cámara, enemigos o colisiones.  
**Cambio de rendimiento:** mide o inspecciona primero; prioriza pixel ratio, antialiasing, culling, actualización de enemigos y disposición de assets antes de cambiar gameplay.

### 3. Integrar audio con aprobación previa

Cuando el usuario pida sonidos, sigue siempre esta secuencia:

1. Busca varias opciones con licencia clara, preferiblemente CC0, dominio público o una licencia que permita el uso del juego.
2. Presenta una ficha de previsualización antes de instalar: nombre, función, duración, formato, fuente, licencia y enlace. Si es posible, entrega una muestra audible o un paquete de preview.
3. Espera aprobación del usuario. No integres sonidos solo porque técnicamente descarguen bien.
4. Después de aprobar, copia los archivos a una carpeta semántica como `assets/audio/enemigos/enemigo-1/cc0/`, conserva un `SOURCE.txt` y carga los buffers desde el código.
5. Conecta cada sonido a un evento concreto: herida, muerte, detección, ronda, ataque o interacción. Usa limitadores de frecuencia y atenuación por distancia para no saturar el juego.
6. Valida que los archivos existan y que el build los sirva. Declara por separado que la carga técnica no equivale a haber escuchado y aprobado la calidad artística.

### 4. Corregir UI, profundidad y mensajes

Para controles táctiles, conserva un elemento visual principal por botón. Los efectos de pulsación deben activarse sobre el botón presionado, no crear sprites duplicados o permanentes en fila.

Para mensajes, sustituye fallbacks como “Dialogue not found” por claves de traducción propias. Evita `alert()`, `confirm()` y `prompt()` en la experiencia del juego; usa un panel de diálogo o notificación con el estilo del proyecto.

Para problemas de profundidad en Three.js, inspecciona las coordenadas `z`, el `renderOrder`, `depthTest`, `depthWrite`, materiales transparentes y el orden de adición a la escena. Los fondos y cajas deben colocarse detrás del jugador y enemigos; no uses `renderOrder` para ocultar un error de coordenadas sin comprender primero la cámara.

Para un enemigo invisible, comprueba en este orden: ruta y mayúsculas del archivo, carga de textura, `repeat`/offset del spritesheet, material `opacity`, `visible`, posición dentro de la cámara, culling y escala. No asumas que “transparente” significa que el material está roto.

### 5. Documentar y respaldar

Mantén un archivo maestro en la raíz, preferiblemente `LUMENFALL.md`, con:

- arquitectura actual y rutas principales;
- estado de cada corrección;
- commits importantes;
- reglas de audio y procedencia de assets;
- validaciones ejecutadas;
- plan de migración técnica y decisiones pendientes.

Guarda reportes extensos en `docs/`, por ejemplo `docs/diagnostico_*.md`, `docs/vercel_*.md` y guías operativas. No borres evidencias visuales o logs sin confirmar que ya no son necesarios.

### 6. Validar

Ejecuta, adaptando los comandos al proyecto:

```bash
npm run build
node --check js/game.js
```

Verifica también las rutas de los archivos nuevos, las claves de traducción, los selectores HTML y los criterios específicos de la petición. Si existe una carpeta `verification/`, conserva o añade una prueba reproducible. Cuando sea posible, levanta Vite y comprueba el DOM y la pantalla inicial en un navegador local.

### 7. Publicar

Antes de confirmar:

```bash
git status --short
git diff --stat
git diff --check
```

Configura la identidad válida del repositorio si el usuario la proporciona. Para Lumenfall usa `215325345+Yanzsmartwood2025@users.noreply.github.com`. Crea un commit descriptivo, publica solo después de validar y confirma el commit remoto mediante GitHub CLI. Entrega el hash, los archivos afectados, las pruebas realizadas y cualquier limitación de la verificación visual.

## Migración React + Tailwind

Recomienda una migración gradual cuando el juego actual use HTML/CSS directo. Conserva el canvas y el núcleo Three.js; crea un adaptador de estado para que React gestione menú, HUD, pausa, inventario, diálogos, idioma y configuración. Migra una pantalla por vez y elimina CSS antiguo únicamente después de validar escritorio, móvil y orientación horizontal.

No mezcles una migración completa con una corrección urgente de gameplay en el mismo commit. Separa la modernización de UI de las correcciones de renderizado, audio o rendimiento para que cada cambio pueda revertirse.

## Entrega al usuario

Explica en español salvo que el usuario solicite otro idioma. Separa claramente: cambios realizados, archivos y commit, validaciones, lo que se escuchó o se vio realmente, y lo que queda pendiente. Si se trata de audio, nunca afirmes que un sonido “quedó bien” solo porque el archivo existe o el build terminó; indica si fue escuchado y aprobado.
