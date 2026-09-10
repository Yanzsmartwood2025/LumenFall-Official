/**
 * lumenfallBridge.js
 * -------------------
 * Contrato de eventos entre `Lumenfall-juego/js/game.js` (Three.js) y la
 * nueva capa de interfaz en React. Ninguno de los dos lados debe leer ni
 * modificar el DOM del otro directamente (regla del paso 6 de LUMENFALL.md):
 * toda la comunicación pasa por `window` mediante CustomEvent.
 *
 * EVENTOS QUE game.js DEBE EMITIR (dispatchEvent):
 *
 *   'lumenfall:assets-progress'  detail: { loaded: number, total: number }
 *     Emitir cada vez que progresa la precarga de texturas/audio/sprites.
 *
 *   'lumenfall:ready'            detail: {}
 *     Emitir una sola vez cuando la escena Three.js ya está inicializada
 *     y lista para arrancar (reemplaza a que la UI adivine por timeout).
 *
 *   'lumenfall:game-over' | 'lumenfall:paused' | 'lumenfall:resumed'
 *     Emitir en los cambios de estado correspondientes del loop de juego.
 *
 * EVENTOS QUE LA UI DE REACT EMITE (y que game.js debe escuchar):
 *
 *   'lumenfall:start-game'       detail: { guest: boolean }
 *     El jugador pulsó "Entrar". Si detail.guest es true, arrancar en modo
 *     invitado aunque no sea localhost (equivalente a `?guest=1`).
 *
 *   'lumenfall:request-pause' | 'lumenfall:request-resume'
 *     El jugador abrió/cerró el menú de pausa desde la UI de React.
 *
 * Esto evita que React llame funciones internas de game.js directamente y
 * evita que game.js necesite conocer React. Cualquiera de los dos lados se
 * puede reescribir sin romper al otro mientras se respete este contrato.
 */

export const LumenfallEvents = {
  ASSETS_PROGRESS: 'lumenfall:assets-progress',
  READY: 'lumenfall:ready',
  GAME_OVER: 'lumenfall:game-over',
  PAUSED: 'lumenfall:paused',
  RESUMED: 'lumenfall:resumed',
  START_GAME: 'lumenfall:start-game',
  REQUEST_PAUSE: 'lumenfall:request-pause',
  REQUEST_RESUME: 'lumenfall:request-resume',
};

/** Emite un evento hacia game.js (usar desde componentes React). */
export function emitToGame(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Suscribe un handler a un evento emitido por game.js y devuelve la función
 * de limpieza, pensada para usarse dentro de un useEffect:
 *
 *   useEffect(() => onGameEvent(LumenfallEvents.READY, () => setReady(true)), []);
 */
export function onGameEvent(eventName, handler) {
  const listener = (e) => handler(e.detail);
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
