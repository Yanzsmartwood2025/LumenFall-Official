# Diagnóstico preliminar de LumenFall

## Entorno de ejecución

El repositorio privado `Yanzsmartwood2025/LumenFall-Official` fue clonado en `/home/ubuntu/LumenFall-Official`. El videojuego está en `/home/ubuntu/LumenFall-Official/Lumenfall-juego`. Se ejecutó localmente con Vite en `http://127.0.0.1:5173/index.html`; no está corriendo en producción desde este entorno de prueba.

## Estado de compilación

`npm ci` terminó correctamente sin vulnerabilidades reportadas por npm. `npm run build` terminó correctamente, aunque Vite mostró dos advertencias: el script clásico `js/game.js` no puede empaquetarse sin `type="module"`, y `../assets/sprites/FX/fuego.png` no se resolvió durante la compilación y quedará para resolverse en tiempo de ejecución.

## Bloqueador funcional detectado

En `Lumenfall-juego/assets/js/auth-core.js` se usa `initializeApp(firebaseConfig)` en la línea 50, pero el import de Firebase Auth no incluye `initializeApp`. El módulo captura el error de inicialización, deja `auth` sin inicializar y la lógica de `index.html` redirige repetidamente al detectar usuario no autenticado. En la prueba local se observaron múltiples mensajes `UNAUTHORIZED ACCESS DETECTED. REDIRECTING...`, por lo que el juego no llega de forma fiable a la escena jugable sin una sesión Firebase válida.

## Riesgos preliminares de rendimiento observados en el código

`game.js` crea muchos objetos Three.js, luces y partículas dinámicas. Hay un sistema de caché de texturas que carga una textura y después devuelve un `clone()` por llamada; esto puede aumentar memoria y llamadas de actualización si se usa masivamente. También aparecen geometrías y materiales creados dentro de clases de efectos, proyectiles y partículas, lo cual puede provocar presión de CPU/GPU durante combates. El renderizador usa antialiasing y no se observó todavía una política explícita de `devicePixelRatio`, por lo que falta medir el coste real en pantallas de alta densidad.

No se han aplicado cambios al repositorio todavía. El siguiente paso es ejecutar una prueba con autenticación desactivada únicamente en una copia local de diagnóstico, o bien usar una sesión autorizada, para poder perfilar la escena jugable sin modificar la versión oficial.

## Primera medición en escena

Se creó una copia aislada en `/tmp/lumenfall-perf` para suprimir únicamente el redireccionamiento de autenticación durante la prueba. La copia compiló y permitió avanzar al menú y activar `JUGAR`; no se modificó el repositorio oficial.

En una medición de 4 segundos con `requestAnimationFrame`, el navegador registró aproximadamente **7–9 FPS**, con una caída gradual de 9 a 7 FPS. El canvas midió 1280×1100 CSS/píxeles con `devicePixelRatio=1`, por lo que el resultado no se explica por una resolución Retina extrema. El heap JavaScript observado pasó aproximadamente de 11 MB a 12 MB durante la muestra. Esto confirma una lentitud importante en la escena de prueba, aunque todavía falta separar el coste de renderizado del coste de lógica y contar objetos/draw calls con un perfil más específico.

El error de orientación (`screen.orientation.lock()` no disponible en el dispositivo de prueba) no parece ser la causa principal de los FPS bajos. La prueba también mostró que el bloqueo de autenticación impide el flujo normal en una sesión local sin Firebase; por eso se utilizó una copia temporal y no la versión oficial.

## Perfilado interno de la escena

La copia instrumentada registró **104 hijos directos** y **130 objetos totales** en el grafo de Three.js, **43 draw calls**, **654 triángulos**, **19 texturas**, **25 geometrías** y **9 programas**. El canvas fue de 1280×1100 con pixel ratio 1. Aunque el número de triángulos es bajo, el coste de renderizado sigue siendo elevado para esta escena.

Para separar la lógica del renderizado, se anuló temporalmente `renderer.render()` únicamente durante una muestra de 3 segundos. La frecuencia subió a aproximadamente **30,7 FPS**, frente a **7,5 FPS** con renderizado activo. Esto apunta a que el cuello de botella principal está en la ruta de renderizado/WebGL y en la composición de materiales, texturas, transparencias o luces, más que en la cantidad de triángulos o en el bucle de lógica puro.

Las prioridades técnicas son: reducir el coste de transparencias y materiales, revisar el uso de `MeshStandardMaterial` y luces para sprites/planos, desactivar antialiasing en dispositivos lentos, limitar la resolución efectiva del renderer y evitar clonar texturas innecesariamente en `getCachedTexture()`.

## Comparación de la primera optimización

En la rama `perf/render-optimization` se probaron dos cambios reversibles: desactivar antialiasing y limitar el pixel ratio máximo a 1. La compilación siguió funcionando correctamente y las advertencias existentes de Vite permanecieron sin cambios.

En la copia instrumentada con antialiasing desactivado y pixel ratio máximo 1, la medición de 3 segundos registró **9,67 FPS**, frente a **7,5 FPS** de la configuración base medida anteriormente. Las draw calls bajaron de 43 a 41; las geometrías y demás cifras variaron ligeramente por el ciclo de carga. La mejora aproximada es del 29%, pero la frecuencia continúa siendo insuficiente, por lo que todavía no debe considerarse una solución final.

La conclusión provisional es que la configuración del renderer sí influye, pero existe otro coste relevante en materiales, transparencias, sombras o luces. No se ha hecho commit ni push de estos cambios; permanecen únicamente en la rama local de trabajo hasta completar una validación más amplia.

## Prueba adicional de sombras

Con la variante optimizada, desactivar temporalmente `renderer.shadowMap.enabled` elevó la muestra a **10,33 FPS**. La mejora frente a 9,67 FPS con sombras activas es modesta, por lo que no se recomienda eliminar las sombras globalmente sin una decisión artística; sí confirma que existe un coste adicional asociado a ellas.

La rama de trabajo conserva por ahora únicamente antialiasing desactivado, `powerPreference: 'high-performance'` y pixel ratio máximo 1. Estas modificaciones son de bajo riesgo y produjeron la mejora más clara observada hasta el momento. La desactivación global de sombras queda como opción configurable, no como cambio aplicado.
