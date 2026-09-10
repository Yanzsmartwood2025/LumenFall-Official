import { useEffect, useRef } from 'react';

/**
 * GameCanvas
 * ----------
 * No crea el canvas de Three.js: cede un <div> vacío para que
 * `Lumenfall-juego/js/game.js` monte el renderer dentro, exactamente como
 * lo hace hoy contra `#ui-container` o el elemento que ya use. React no
 * vuelve a tocar el contenido de este div en renders posteriores (por eso
 * el ref y no un estado), para no pelear con el render loop de Three.js.
 *
 * Integración en game.js: cambiar el punto donde hoy se hace
 *   document.querySelector('#ui-container').appendChild(renderer.domElement)
 * por
 *   document.querySelector('#lumenfall-canvas-root').appendChild(renderer.domElement)
 */
export default function GameCanvas({ onMount }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && typeof onMount === 'function') {
      onMount(containerRef.current);
    }
  }, [onMount]);

  return (
    <div
      id="lumenfall-canvas-root"
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
    />
  );
}
