# Lumenfall — Archivo maestro del proyecto

**Repositorio:** `Yanzsmartwood2025/LumenFall-Official`  
**Rama estable:** `main`  
**Juego:** Three.js + Vite  
**Despliegue:** Vercel  
**Última actualización:** 2026-09-05

> Este archivo es el punto de referencia principal de Lumenfall. Resume el estado real del código, las decisiones aplicadas, los respaldos técnicos y la estrategia recomendada para modernizar la interfaz sin romper el juego.

## 1. Estructura actual

El videojuego se encuentra en `Lumenfall-juego/`. La lógica principal permanece en `Lumenfall-juego/js/game.js`, los estilos de la interfaz están en `Lumenfall-juego/css/style.css` y el marcado base está en `Lumenfall-juego/index.html`. Los recursos se organizan dentro de `Lumenfall-juego/assets/`, especialmente sprites, texturas, interfaz y audio.

El núcleo del juego es una escena Three.js administrada desde JavaScript directo. La interfaz HTML/CSS se superpone al canvas mediante `#ui-container`; por tanto, actualmente no existe una aplicación React dentro del videojuego.

## 2. Trabajo realizado

| Área | Estado | Resultado |
|---|---|---|
| Rendimiento WebGL | Completado | Antialiasing desactivado, `powerPreference: 'high-performance'` y pixel ratio máximo limitado a 1. |
| Rutas de assets | Completado | Se corrigieron rutas rotas y se verificó la compilación con Vite. |
| Despliegue | Completado | Se corrigió el correo de commits para Vercel: `215325345+Yanzsmartwood2025@users.noreply.github.com`. |
| Sonidos de monstruos | Completado | Se integraron efectos CC0 de acecho, herida, rugido y muerte, con licencia documentada. |
| Controles táctiles | Completado | El botón de ataque dejó de mostrar sprites repetidos; ahora usa un solo sprite y el aura aparece al pulsar. |
| Mensajes del juego | Completado | Se eliminó el fallback “Dialogue not found” y se añadió un mensaje misterioso propio. |
| Enemigo inicial | Completado | Se colocó en una posición visible a la derecha y se forzó su opacidad/visibilidad inicial. |
| Profundidad de la primera puerta | Completado | La caja y sus piezas se colocaron detrás del jugador y de los enemigos. |

## 3. Commits importantes

| Commit | Descripción |
|---|---|
| `1203aab` | Reducción inicial del coste del renderizado en dispositivos lentos. |
| `a95785b` | Estabilización de carga y configuración del renderer. |
| `092f852` | Fusión de optimizaciones y correcciones de carga. |
| `b247a76` | Integración de sonidos CC0 de monstruos. |
| `14ed119` | Corrección de controles, mensajes y profundidad de escena. |

## 4. Audio CC0 integrado

Los archivos están en `Lumenfall-juego/assets/audio/enemigos/enemigo-1/cc0/`. La fuente y la licencia están registradas en `SOURCE.txt`. Los sonidos se cargan desde `js/game.js` con estos usos: `creature_stalk_01.ogg` para acecho, `creature_hurt_01.ogg` para impactos, `creature_die_01.ogg` para muerte y `creature_roar_01.ogg` para detección.

El procedimiento correcto para futuras modificaciones de audio será: **buscar, escuchar o previsualizar, pedir aprobación, instalar, integrar y probar**. No se debe volver a integrar un sonido nuevo sin presentar primero una muestra o una ficha de escucha.

## 5. Documentación y respaldos

Los reportes consolidados se encuentran en `docs/`:

- `docs/diagnostico_lumenfall_hallazgos.md`: hallazgos de rendimiento, carga y renderizado.
- `docs/guia_hermes_coolify.md`: configuración de `yt-dlp` y `ffmpeg` para Hermes en Coolify.
- `docs/vercel_blocked_lumenfall.md`: diagnóstico del despliegue bloqueado en Vercel.
- `LUMENFALL.md`: este resumen maestro, ubicado en la raíz para que sea fácil de encontrar.

Las imágenes de comprobación histórica permanecen en `verification/`. No se deben borrar hasta decidir qué evidencias siguen siendo necesarias.

## 6. Validación actual

La validación local vigente consiste en ejecutar `npm run build` desde `Lumenfall-juego/`, comprobar `node --check js/game.js` y verificar las rutas críticas de assets. La compilación reciente terminó correctamente y las comprobaciones estáticas confirmaron que los controles contienen un solo sprite de ataque y que no hay llamadas a `alert()`, `confirm()` o `prompt()` en `game.js`.

## 7. Recomendación: migración gradual a React + Tailwind

La migración es recomendable para la **interfaz moderna**, pero no aconsejo reescribir de golpe el núcleo Three.js. React puede administrar HUD, menú principal, pausa, inventario, diálogos y configuración; Three.js debe seguir administrando la escena, cámara, enemigos, proyectiles, física visual y el bucle de renderizado.

Tailwind puede reemplazar gradualmente gran parte de `css/style.css`, especialmente para paneles, botones, overlays, HUD y menús. Sin embargo, los estilos que dependen de animaciones precisas, posicionamiento del canvas, efectos de pantalla y componentes muy específicos deben permanecer en CSS modular o en hojas dedicadas.

### Arquitectura propuesta

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Escena | Three.js | Mundo 3D, cámara, enemigos, objetos, colisiones y render loop. |
| Adaptador | JavaScript/TypeScript | Eventos y estado compartido entre Three.js y React. |
| Interfaz | React | Menú, HUD, pausa, diálogos, inventario y configuración. |
| Estilos | Tailwind CSS + CSS específico | Diseño responsive, tema visual y efectos especiales. |
| Assets | `assets/` existente | Mantener rutas estables durante la migración. |

### Orden seguro de migración

1. Crear una rama `feat/react-tailwind-ui` y conservar `main` como versión estable.
2. Mantener `game.js` funcionando y encapsular el canvas en un componente `GameCanvas`.
3. Migrar primero el menú principal y la pantalla de carga.
4. Migrar después `#ui-container`, controles táctiles y cuadro de diálogo.
5. Migrar el menú de pausa, audio, idioma y gamepad.
6. Conectar el estado de React con eventos explícitos, sin leer ni modificar directamente el DOM desde varios lugares.
7. Eliminar CSS antiguo solo después de comprobar cada pantalla en escritorio, móvil y orientación horizontal.
8. Ejecutar build y pruebas visuales antes de fusionar cada bloque.

**Conclusión:** React + Tailwind es una buena dirección para modernizar Lumenfall, pero debe utilizarse como una nueva capa de interfaz sobre Three.js, no como reemplazo inmediato del motor del juego.

## 8. Habilidades reutilizables

Las habilidades creadas durante el trabajo quedan respaldadas en `skills/`. La habilidad `skills/lumenfall-maintenance/SKILL.md` contiene el proceso reutilizable para auditar el proyecto, modificarlo de forma incremental, gestionar audio con aprobación previa, documentar cambios, validar builds y publicar en GitHub.

La copia operativa de la habilidad para el entorno de Manus se mantiene en `/home/ubuntu/skills/lumenfall-maintenance/SKILL.md`; la copia en `skills/` es el respaldo versionado en la nube dentro de este repositorio.

## 9. Regla de trabajo para continuar

Antes de modificar código existente se debe leer este archivo, revisar `git status`, crear una rama para cambios grandes, conservar `main` como respaldo y ejecutar la compilación antes de publicar. Cada cambio de audio debe seguir el flujo de escucha y aprobación indicado arriba.
