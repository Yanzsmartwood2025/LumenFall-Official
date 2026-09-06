# Auditoría completa de audio de Lumenfall

**Fecha:** 2026-09-06  
**Alcance:** todos los archivos de `Lumenfall-juego/assets/audio/`, precarga, reproducción y eventos del código.  
**Estado:** auditoría técnica terminada; no se modificó el código durante esta revisión.

> Esta auditoría confirma existencia, formato, duración, precarga y referencias de código. La calidad artística debe confirmarse escuchando el paquete de previsualización adjunto antes de sustituir o añadir sonidos.

## Inventario

| Archivo | Formato | Duración | Estado técnico |
|---|---:|---:|---|
| `ambience/dungeons/calabozo_de_piedra.mp3` | MP3, estéreo, 44.1 kHz | 22.047 s | Precargado y usado como ambiente en bucle |
| `characters/joziel/attack_voice.mp3` | MP3, estéreo, 48 kHz | 1.536 s | Precargado y usado al atacar |
| `characters/joziel/charge.mp3` | MP3, estéreo, 48 kHz | 1.536 s | Precargado y usado durante carga |
| `characters/joziel/fireball_cast.mp3` | MP3, estéreo, 48 kHz | 1.152 s | Precargado y usado al lanzar proyectil |
| `characters/joziel/fireball_impact.mp3` | MP3, estéreo, 48 kHz | 1.536 s | Precargado y usado al impactar |
| `characters/joziel/hurt.mp3` | MP3, estéreo, 48 kHz | 2.280 s | Precargado y usado cuando Joziel recibe daño |
| `characters/joziel/jump.mp3` | MP3, estéreo, 48 kHz | 1.536 s | Precargado y usado al saltar |
| `characters/joziel/pasos-joziel.mp3` | MP3, estéreo, 44.1 kHz | 0.967 s | Precargado y usado en pasos |
| `enemigos/enemigo-1/cc0/creature_die_01.ogg` | OGG Vorbis, estéreo, 48 kHz | 1.060 s | Precargado y usado en muerte |
| `enemigos/enemigo-1/cc0/creature_hurt_01.ogg` | OGG Vorbis, estéreo, 48 kHz | 0.621 s | Precargado y usado en herida |
| `enemigos/enemigo-1/cc0/creature_roar_01.ogg` | OGG Vorbis, estéreo, 48 kHz | 0.640 s | Precargado y usado al detectar al jugador |
| `enemigos/enemigo-1/cc0/creature_stalk_01.ogg` | OGG Vorbis, estéreo, 48 kHz | 0.255 s | Precargado como `enemy1_growl` y usado para acecho |
| `enemigos/enemigo-1/impacto.mp3` | MP3, estéreo, 44.1 kHz | 2.847 s | Precargado y usado como impacto |
| `enemigos/enemigo-1/movimiento.mp3` | MP3, estéreo, 44.1 kHz | 16.170 s | Existe, pero no tiene referencia en `game.js` |
| `enemigos/enemigo-1/pasos.mp3` | MP3, estéreo, 44.1 kHz | 3.422 s | Precargado y usado como pasos del enemigo |
| `puerta-calabozo.mp3` | MP3, estéreo, 44.1 kHz | 5.747 s | Precargado y usado al interactuar/desbloquear |
| `sfx/thunder_distant.mp3` | MP3, estéreo, 48 kHz | 5.040 s | Precargado y usado como trueno distante |
| `sfx/thunder_strike.mp3` | MP3, estéreo, 48 kHz | 5.040 s | Precargado y usado como trueno cercano |
| `voz-fantasma.mp3` | MP3, mono, 48 kHz | 20.664 s | Precargado y usado por el fantasma decorativo y la puerta bloqueada |

## Diagnóstico del fantasma

El archivo `voz-fantasma.mp3` sí existe y sí se precarga como `fantasma_lamento`. Además, `DecorGhost` se crea al cargar `dungeon_1`, inicia una fuente Web Audio en bucle y actualiza su ganancia según la distancia a Joziel. La misma voz se reproduce una vez cuando el jugador intenta abrir una puerta bloqueada.

El punto frágil encontrado es que `DecorGhost.startVoice()` se ejecuta una sola vez. Si en ese momento el buffer no estuviera disponible o la carga fallara, el fantasma no intenta iniciar la voz nuevamente. En el flujo actual `startGame()` espera el `Promise.all` de la precarga antes de llamar a `loadLevelById()`, así que técnicamente debería disponer del buffer. Aun así, falta una comprobación visible de estado y un reintento defensivo si el usuario confirma que no lo escucha.

El fantasma solo se crea automáticamente en `dungeon_1`; no se crea en todas las salas. Por ello, no debe esperarse su voz en niveles donde no exista una instancia de `DecorGhost`.

## Diagnóstico de monstruos

El enemigo de tipo `EnemyX1` tiene cinco eventos conectados: acecho mediante `enemy1_growl`, pasos mediante `enemy1_step`, impacto mediante `enemy1_impact`, herida mediante `enemy1_hurt`, muerte mediante `enemy1_death` y detección mediante `enemy1_roar`. Los cuatro sonidos CC0 están correctamente asociados a los eventos nuevos.

El archivo `movimiento.mp3` es el único audio de monstruo existente que actualmente no aparece referenciado en `game.js`. Esto puede explicar la sensación de que “faltan sonidos”: existe un audio de movimiento, pero el código utiliza `pasos.mp3` y no `movimiento.mp3`.

## Precarga y cobertura

La precarga contiene 18 claves. El inventario contiene 19 archivos. La diferencia es `movimiento.mp3`, que existe en disco pero no se carga ni se reproduce. No se encontró ningún archivo de audio separado para un segundo tipo de monstruo; el sistema actual utiliza principalmente `EnemyX1`, más el `DecorGhost`.

No se debe integrar ni sustituir `movimiento.mp3` todavía. Primero debe escucharse junto con los demás audios y aprobarse su función: movimiento continuo, respiración, acecho o reemplazo de pasos.

## Próximo paso seguro

Escuchar el paquete `lumenfall-audio-preview.zip`, que contiene los 19 archivos conservando sus rutas. Después de la aprobación del usuario se puede decidir si activar `movimiento.mp3`, reforzar el fantasma con reintento/indicador de estado o ajustar volúmenes y atenuación. Esta auditoría no autoriza todavía ninguna modificación de audio.
