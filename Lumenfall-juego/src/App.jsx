import { useEffect, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import LoadingScreen from './components/LoadingScreen';
import MainMenu from './components/MainMenu';
import { LumenfallEvents, onGameEvent } from './lumenfallBridge';

/**
 * App
 * ---
 * Estado mínimo necesario para el paso 3 del plan (menú + carga):
 *
 *   'loading' -> se muestra mientras game.js precarga assets
 *   'menu'    -> pantalla de título, visible sobre el canvas ya inicializado
 *   'playing' -> la UI de React se aparta y deja el canvas a pantalla completa
 *
 * El siguiente paso (paso 4: #ui-container, controles táctiles, diálogo)
 * añade más estados/overlays a este mismo componente sin tocar GameCanvas.
 */
export default function App() {
  const [phase, setPhase] = useState('loading');
  const [progress, setProgress] = useState({ loaded: 0, total: 1 });

  useEffect(() => {
    const cleanups = [
      onGameEvent(LumenfallEvents.ASSETS_PROGRESS, (detail) => setProgress(detail)),
      onGameEvent(LumenfallEvents.READY, () => setPhase('menu')),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, []);

  const handleCanvasMount = (containerEl) => {
    // Punto de enganche para game.js. Ver README-INTEGRACION.md: game.js
    // debe llamar a window.LumenfallGame.init(containerEl) aquí, o bien
    // este callback puede quedar vacío si game.js prefiere buscar
    // `#lumenfall-canvas-root` por su cuenta al cargar.
    if (window.LumenfallGame?.init) {
      window.LumenfallGame.init(containerEl);
    }
  };

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-void ${phase !== 'playing' ? 'z-[10001]' : 'z-0'}`}>
      <GameCanvas onMount={handleCanvasMount} />

      {phase === 'loading' && (
        <LoadingScreen loaded={progress.loaded} total={progress.total} />
      )}
      {phase === 'menu' && (
        <MainMenu onStart={() => setPhase('playing')} />
      )}
    </div>
  );
}
