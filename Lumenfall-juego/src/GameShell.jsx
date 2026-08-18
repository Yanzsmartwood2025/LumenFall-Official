import { useEffect } from 'react';

const gameMarkup = `<div id="agony-overlay"></div>
    <div id="death-video-container"></div>
    <div id="start-button-container">
        <button id="start-button" data-translate-key="start">Empezar</button>
    </div>

    <div id="intro-screen">
        <img id="intro-image" src="" alt="Intro Image">
    </div>

    <div id="menu-screen">
        <div id="language-select-container">
            <label for="language-select" data-translate-key="languageLabel">IDIOMA:</label>
            <select id="language-select">
                <option value="es">Español</option>
                <option value="en">English</option>
            </select>
        </div>
        <button id="play-button" class="menu-option" data-translate-key="play">JUGAR</button>
        <button id="store-button" class="menu-option" data-translate-key="store">TIENDA</button>

        <div id="souls-container">
            <img src="assets/ui/icons/fuego-de-botones-1.png" alt="Souls">
            <span id="souls-count">0</span>
        </div>
    </div>

    <canvas id="bg-canvas"></canvas>
    <div id="vignette-overlay"></div>
    <div id="ui-container">
        <div id="ui-top">
            <div class="player-info">
                <div id="player-profile-container">
                    <img id="player-profile-image" src="assets/ui/hud/UI_HUD_Portrait_Player_Circle.png" alt="Energy Bar Profile">
                    <div id="joziel-halo"></div>
                </div>
                <div class="stats-group">
                    <div id="energy-bar">
                        <div id="energy-fill"></div>
                    </div>
                    <div id="power-bar">
                        <div id="power-fill" class="stat-bar-fill"></div>
                    </div>
                    <div id="spectral-bar">
                        <div id="spectral-flask-container">
                            <div id="soul-flame-animation"></div>
                            <div id="spectral-fill" class="stat-bar-fill"></div>
                        </div>
                        <span id="soul-charges-count">0</span>
                    </div>
                </div>
                <div class="stat-label">JOZIEL</div>
            </div>
            <div id="gamepad-status" data-translate-key="gamepadConnected">Control Conectado</div>
        </div>
        <div id="controls">
            <div id="joystick-container">
                <div id="joystick-knob"></div>
            </div>
            <div class="right-controls">
                <div id="btn-shoot" class="control-btn">
                     <img src="assets/ui/icons/fuego-de-botones-1.png" alt="Shoot">
                     <span data-translate-key="shoot">Disparar</span>
                </div>
                <div id="btn-attack" class="control-btn">
                    <div class="flame-ring">
                        <img src="assets/ui/icons/fuego-de-botones-1.png" alt="Flame 1">
                        <img src="assets/ui/icons/fuego-de-botones-1.png" alt="Flame 2">
                        <img src="assets/ui/icons/fuego-de-botones-1.png" alt="Flame 3">
                        <img src="assets/ui/icons/fuego-de-botones-1.png" alt="Flame 4">
                        <img src="assets/ui/icons/fuego-de-botones-1.png" alt="Flame 5">
                    </div>
                    <span data-translate-key="attack">Atacar</span>
                </div>
            </div>
        </div>
        <div id="dialogue-box"></div>
    </div>

    <div id="pause-menu">
        <h2 data-translate-key="settings">Configuración</h2>
        <div class="pause-menu-content">
            <div class="menu-item">
                <p data-translate-key="languageLabel">Idioma:</p>
                <select id="pause-language-select">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                </select>
            </div>

            <button id="gamepad-toggle" class="pause-button" data-translate-key="activateGamepad">Activar Control</button>

            <button id="vibration-toggle" class="pause-button" data-translate-key="toggleVibrationOn">Vibración: ON</button>

            <div class="audio-control-panel">
                <h3 data-translate-key="audioControls">Controles de Audio</h3>
                <div class="audio-control">
                    <span data-translate-key="musicVolume">Música Ambiental:</span>
                    <button id="music-toggle">▶</button>
                    <input type="range" id="music-volume" class="slider" min="0" max="1" step="0.1" value="0.5">
                </div>
                <div class="audio-control">
                    <span data-translate-key="sfxVolume">Pasos:</span>
                    <button id="sfx-toggle">▶</button>
                    <input type="range" id="sfx-volume" class="slider" min="0" max="1" step="0.1" value="0.5">
                </div>
            </div>
        </div>
        <button id="resume-button" class="close-btn" data-translate-key="resume">Reanudar</button>
    </div>

    <div id="transition-overlay">
        <div id="loading-content">
            <img id="loading-image" src="assets/ui/menu-principal.jpg" alt="Loading Screen">
            <span id="loading-text"></span>
        </div>
    </div>

    <div id="game-over-screen">
        <h1>Game Over</h1>
        <button id="continue-button">Continuar</button>
        <button id="quit-button">Salir</button>
    </div>

    <div id="rotate-device-overlay">
        <div class="rotate-device-message" data-translate-key="rotateDevice">
            Por favor, gira tu dispositivo a modo horizontal.
        </div>
    </div>`;

function appendScript(src, type) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    if (type) script.type = type;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function waitForAuthCore() {
  if (window.LumenfallAuth) return Promise.resolve();

  return new Promise((resolve) => {
    const checkAuth = () => {
      if (window.LumenfallAuth) {
        resolve();
        return;
      }
      requestAnimationFrame(checkAuth);
    };

    checkAuth();
  });
}

function wireAuthentication() {
  waitForAuthCore().then(() => {
    window.LumenfallAuth.onStateChanged((user) => {
      if (!user) {
        console.warn('⚠️ UNAUTHORIZED ACCESS DETECTED. REDIRECTING...');
        window.location.href = '../index.html';
        return;
      }

      console.log('✅ Pilot Authenticated:', user.displayName || user.email);
      window.currentUserData = user;
    });
  });
}

export default function GameShell() {
  useEffect(() => {
    let cancelled = false;

    appendScript('../assets/js/auth-core.js', 'module').then(() => {
      if (!cancelled) wireAuthentication();
    });

    appendScript('js/game.js?v=react_tailwind_2026');

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      className="min-h-screen bg-black text-white antialiased"
      dangerouslySetInnerHTML={{ __html: gameMarkup }}
    />
  );
}
