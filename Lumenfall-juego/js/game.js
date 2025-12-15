// --- src/game.js (Lógica Principal) ---

        const assetUrls = {
            runningSprite: 'assets/sprites/Joziel/Movimiento/Correr-1.png',
            runningBackSprite: 'assets/sprites/Joziel/Movimiento-B/Movimiento-B-1.png',
            runningShadowSprite: 'assets/sprites/Joziel/Sombras-efectos/Sombra-correr-1.jpg',
            idleSprite: 'assets/sprites/Joziel/Movimiento/Idle.png',
            idleShadowSprite: 'assets/sprites/Joziel/Sombras-efectos/Idle-sombra.jpg',
            attackSprite: 'assets/sprites/Joziel/attack_sprite_sheet.png',
    jumpSprite: 'assets/sprites/Joziel/Movimiento/saltar.png',
    jumpBackSprite: 'assets/sprites/Joziel/Movimiento-B/saltar-b.png',
            flameParticle: 'assets/vfx/particles/fuego.png',
            wallTexture: 'assets/environment/dungeon/pared-calabozo.png',
            doorTexture: 'assets/environment/dungeon/puerta-calabozo.png',
            floorTexture: 'assets/environment/dungeon/piso-calabozo.png',
            torchTexture: 'assets/environment/props/antorcha.png',
            specterTexture: 'assets/sprites/enemies/fantasma.png',
            introImage: 'assets/ui/Intro.jpg',
            menuBackgroundImage: 'assets/ui/menu-principal.jpg',
            animatedEnergyBar: 'assets/ui/barra-de-energia.png',
    enemySprite: 'assets/sprites/enemies/enemigo-1.png',
    dustParticle: 'assets/vfx/particles/Polvo.png'
        };

        const totalRunningFrames = 9;
        const totalIdleFrames = 5;
        const totalAttackFrames = 6;
        const totalJumpFrames = 7;
        const totalSpecterFrames = 5;
        const totalEnemyFrames = 5;
        const animationSpeed = 80;
        const idleAnimationSpeed = 150;
        const specterAnimationSpeed = 120;
        const moveSpeed = 0.2;
        const playableAreaWidth = 120;
        const roomDepth = 15;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffers = {};
        const audioSources = {};
        const gainNodes = {};

        async function loadAudio(name, url) {
            return new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    audioBuffers[name] = await audioContext.decodeAudioData(arrayBuffer);
                    resolve();
                } catch (error) {
                    console.error(`Error loading audio "${name}":`, error);
                    reject(error);
                }
            });
        }

        function playAudio(name, loop = false, playbackRate = 1.0, volume = 0.5, startOffset = 0) {
            if (!audioBuffers[name]) return;
            if (audioSources[name] && audioSources[name].buffer) stopAudio(name);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffers[name];
            source.loop = loop;
            source.playbackRate.value = playbackRate;
            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume;
            source.connect(gainNode).connect(audioContext.destination);
            source.start(0, startOffset);
            audioSources[name] = source;
            gainNodes[name] = gainNode;
        }

        function stopAudio(name) {
            if (audioSources[name]) {
                audioSources[name].stop();
                delete audioSources[name];
            }
        }

        function setAudioVolume(name, volume) {
            if (gainNodes[name]) gainNodes[name].gain.value = volume;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        window.camera = camera; // Debug exposure
        const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true, alpha: true });
        window.renderer = renderer; // Debug exposure
        const textureLoader = new THREE.TextureLoader();
        const clock = new THREE.Clock();

        let player;
        const allFlames = [];
        const allFootstepParticles = [];
        const allSpecters = [];
        const allSimpleEnemies = [];
        const allGates = [];
        const allStatues = [];
        const allOrbs = [];
        const allPuzzles = [];
        const allProjectiles = [];
        const allPowerUps = [];
        let dustSystem;

        let currentLevelId = 'dungeon_1';
        let isPaused = false;
        let isTransitioning = false;
        let animationFrameId;

let lightningLight;
let stormTimerStrike = Math.random() * 20 + 20; // 20-40s initial
let stormTimerDistant = Math.random() * 7 + 8; // 8-15s initial
let isLightningActive = false;

        const completedRooms = { room_1: false, room_2: false, room_3: false, room_4: false, room_5: false };

        let isGamepadModeActive = false;
        let vibrationLevel = 1; // 0: Off, 1: Soft, 2: Strong
        let isAttackButtonPressed = false;
        let attackPressStartTime = 0;
        let interactPressed = false;
        let joyVector = new THREE.Vector2(0, 0);
        let prevGamepadButtons = {};

        camera.position.set(0, 4, 8);
        camera.lookAt(0, 2, 0);
        camera.far = roomDepth + 50;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.fog = null;
        scene.add(ambientLight);
        window.scene = scene; // Debug exposure
        const directionalLight = new THREE.DirectionalLight(0xaaaaaa, 0.5);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

lightningLight = new THREE.DirectionalLight(0xaaddff, 0);
lightningLight.position.set(0, 20, 10);
lightningLight.castShadow = true;
scene.add(lightningLight);

function triggerLightningStrike() {
    // Evento Impacto: Flash intenso + Audio fuerte
    // Light: 0 -> 10.0 -> Flickers -> 0 (Extended duration ~500ms)
    lightningLight.intensity = 10.0;
    isLightningActive = true;
    if (dustSystem) dustSystem.setLightningState(10.0); // Boost particles

    playAudio('thunder_strike', false, 1.0, 1.0); // Play full volume

    // Flicker sequence: Flash -> Dim -> Flash -> Off
    setTimeout(() => { lightningLight.intensity = 2.0; }, 100);
    setTimeout(() => { lightningLight.intensity = 8.0; }, 200);
    setTimeout(() => { lightningLight.intensity = 1.0; }, 350);

    setTimeout(() => {
        lightningLight.intensity = 0;
        isLightningActive = false;
        if (dustSystem) dustSystem.setLightningState(0);
    }, 500);
}

function triggerDistantThunder() {
    // Evento Distante: Parpadeo suave + Audio medio
    // Light: 0 -> 0.5 -> 0
    lightningLight.intensity = 0.5;
    playAudio('thunder_distant', false, 1.0, 0.4); // Play lower volume

    setTimeout(() => {
        lightningLight.intensity = 0;
    }, 150); // Slightly longer fade for distant flicker
}

        function animate() {
            if (isPaused) return;
            animationFrameId = requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

    if (!isPaused) {
        // Storm Logic: Option B (Independent Timers)
        stormTimerStrike -= deltaTime;
        stormTimerDistant -= deltaTime;

        if (stormTimerStrike <= 0) {
            triggerLightningStrike();
            stormTimerStrike = Math.random() * 20 + 20; // Reset to 20-40s
        }

        if (stormTimerDistant <= 0) {
            triggerDistantThunder();
            stormTimerDistant = Math.random() * 7 + 8; // Reset to 8-15s
        }
    }

            if (isGamepadModeActive) {
                handleGamepadInput();
            }

            if (player && !isTransitioning) {
                const attackHeld = isAttackButtonPressed && (Date.now() - attackPressStartTime > 200);
                player.update(deltaTime, { joyVector, attackHeld });

                // Collision detection between player and enemies
                allSimpleEnemies.forEach(enemy => {
                    if (!player.isInvincible && player.mesh.position.distanceTo(enemy.mesh.position) < 2) { // Collision distance
                        player.takeDamage(player.maxHealth * 0.05, enemy); // Player takes 5% damage
                    }
                });

                let isNearInteractable = false;
                let interactableObject = null;

                allGates.forEach(gate => {
                    const distance = player.mesh.position.distanceTo(gate.mesh.position);
                    const distanceX = Math.abs(player.mesh.position.x - gate.mesh.position.x);

                    // Atmospheric Dimming & Interactive Glow
                    const gateMesh = gate.mesh.children[0]; // Assuming 0 is the door mesh
                    if (distance < 10) {
                        // Close: Pulse Blue Rim Light
                        const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.5; // 0 to 1
                        gateMesh.material.emissive.setHex(0x00aaff);
                        gateMesh.material.emissiveIntensity = 0.5 + pulse * 0.5;
                        gateMesh.material.color.setHex(0xffffff); // Full brightness
                    } else {
                        // Far: Dim it down (Atmosphere)
                        gateMesh.material.emissiveIntensity = 0;
                        const dimFactor = Math.max(0.2, 1 - (distance / 40));
                        gateMesh.material.color.setScalar(dimFactor);
                    }

                    if (distanceX < 4) {
                        isNearInteractable = true;
                        interactableObject = {type: 'gate', object: gate};
                    }
                    const screenPosition = gate.mesh.position.clone();
                    screenPosition.y += 6.8;
                    const vector = screenPosition.project(camera);
                    const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
                    const y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
                    gate.numeralElement.style.left = `${x}px`;
                    gate.numeralElement.style.top = `${y}px`;
                });

                allPuzzles.forEach(puzzle => {
                    if (!puzzle.isSolved) {
                        const distanceX = Math.abs(player.mesh.position.x - puzzle.mesh.position.x);
                        if (distanceX < 5) {
                            isNearInteractable = true;
                            interactableObject = {type: 'puzzle', object: puzzle};
                        }
                    }
                });

                allStatues.forEach(statue => {
                    const distanceX = Math.abs(player.mesh.position.x - statue.mesh.position.x);
                    if (distanceX < 5) {
                        isNearInteractable = true;
                        interactableObject = {type: 'statue', object: statue};
                    }
                });

                if (isNearInteractable) {
                    const screenPosition = interactableObject.object.mesh.position.clone();
                    screenPosition.y += (interactableObject.type === 'gate' ? 5 : 4);
                    const vector = screenPosition.project(camera);
                    const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
                    const y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
                    doorPromptFlame.style.left = `${x}px`;
                    doorPromptFlame.style.top = `${y}px`;
                    doorPromptFlame.style.display = 'block';

                    if (interactPressed) {
                        if (interactableObject.type === 'gate') {
                            const gate = interactableObject.object;
                            const destinationId = gate.destination;
                            let spawnX = null;
                            if (destinationId === 'dungeon_1') {
                                const roomNumber = gate.id.split('_')[1];
                                const targetGateId = `gate_${roomNumber}`;
                                const targetGate = MAPS.dungeon_1.gates.find(g => g.id === targetGateId);
                                if (targetGate) {
                                    spawnX = targetGate.x;
                                }
                            }
                            playAudio('puerta');
                            triggerTransition(destinationId, spawnX);
                        } else if (interactableObject.type === 'puzzle') {
                            interactableObject.object.solve();
                        } else if (interactableObject.type === 'statue') {
                            interactableObject.object.interact();
                        }
                    }
                } else {
                    doorPromptFlame.style.display = 'none';
                }

                const isMoving = Math.abs(joyVector.x) > 0.1;
                if (isMoving && player.isGrounded) {
                    if (!audioSources['pasos']) playAudio('pasos', true);
                } else {
                    if (audioSources['pasos']) stopAudio('pasos');
                }
            }

            interactPressed = false;
            for (let i = allFlames.length - 1; i >= 0; i--) {
                if (!allFlames[i].update(deltaTime)) {
                    allFlames.splice(i, 1);
                }
            }
            for (let i = allFootstepParticles.length - 1; i >= 0; i--) {
                if (!allFootstepParticles[i].update(deltaTime)) {
                    allFootstepParticles.splice(i, 1);
                }
            }
            allSpecters.forEach(specter => specter.update(deltaTime, player));
            allSimpleEnemies.forEach(enemy => enemy.update(deltaTime));
            allPuzzles.forEach(puzzle => puzzle.update(deltaTime));
            allPowerUps.forEach(powerUp => powerUp.update(deltaTime));
            if (dustSystem) dustSystem.update();

            for (let i = allProjectiles.length - 1; i >= 0; i--) {
                if (!allProjectiles[i].update(deltaTime)) {
                    scene.remove(allProjectiles[i].mesh);
                    allProjectiles.splice(i, 1);
                }
            }

            renderer.render(scene, camera);
        }

        const startButtonContainer = document.getElementById('start-button-container');
        const startButton = document.getElementById('start-button');
        const introScreen = document.getElementById('intro-screen');
        const introImage = document.getElementById('intro-image');
        const menuScreen = document.getElementById('menu-screen');
        const playButton = document.getElementById('play-button');
        const languageSelect = document.getElementById('language-select');
        const pauseLanguageSelect = document.getElementById('pause-language-select');
        const btnAttack = document.getElementById('btn-attack');
        const btnShoot = document.getElementById('btn-shoot');
        const doorPromptFlame = document.getElementById('door-prompt-flame');
        const jozielHalo = document.getElementById('joziel-halo');
        const pauseMenu = document.getElementById('pause-menu');
        const resumeButton = document.getElementById('resume-button');
        const musicVolumeSlider = document.getElementById('music-volume');
        const sfxVolumeSlider = document.getElementById('sfx-volume');
        const musicToggleButton = document.getElementById('music-toggle');
        const sfxToggleButton = document.getElementById('sfx-toggle');
        const transitionOverlay = document.getElementById('transition-overlay');
        const loadingContent = document.getElementById('loading-content');
        const loadingText = document.getElementById('loading-text');
        const numeralsContainer = document.getElementById('numerals-container');
        const dialogueBox = document.getElementById('dialogue-box');
        const gamepadStatus = document.getElementById('gamepad-status');
        const gamepadToggleButton = document.getElementById('gamepad-toggle');
        const vibrationToggleButton = document.getElementById('vibration-toggle');
        const controlsContainer = document.getElementById('controls');
        const gameOverScreen = document.getElementById('game-over-screen');
        const continueButton = document.getElementById('continue-button');
        const quitButton = document.getElementById('quit-button');

        let currentLanguage = 'es';
        const translations = {
            es: {
                start: "Empezar",
                loading: "Cargando...",
                play: "JUGAR",
                languageLabel: "IDIOMA:",
                settings: "Configuración",
                musicVolume: "Música Ambiental:",
                sfxVolume: "Pasos:",
                resume: "Reanudar",
                gamepadConnected: "Control Conectado",
                audioControls: "Controles de Audio",
                shoot: "Disparar",
                attack: "Recargar",
                activateGamepad: "Activar Control",
                deactivateGamepad: "Activar Táctil",
                vibrationOff: "Vibración: OFF",
                vibrationSoft: "Vibración: SUAVE",
                vibrationStrong: "Vibración: FUERTE"
            },
            en: {
                start: "Start",
                loading: "Loading...",
                play: "PLAY",
                languageLabel: "LANGUAGE:",
                settings: "Settings",
                musicVolume: "Ambient Music:",
                sfxVolume: "Footsteps:",
                resume: "Resume",
                gamepadConnected: "Gamepad Connected",
                audioControls: "Audio Controls",
                shoot: "Shoot",
                attack: "Reload",
                activateGamepad: "Activate Gamepad",
                deactivateGamepad: "Activate Touch",
                vibrationOff: "Vibration: OFF",
                vibrationSoft: "Vibration: SOFT",
                vibrationStrong: "Vibration: STRONG"
            }
        };

        function updateUIText() {
            const lang = translations[currentLanguage];
            document.querySelectorAll('[data-translate-key]').forEach(el => {
                const key = el.dataset.translateKey;
                if (lang[key]) {
                    el.textContent = lang[key];
                }
            });

            gamepadToggleButton.textContent = isGamepadModeActive
                ? lang.deactivateGamepad
                : lang.activateGamepad;

            const vibKeys = ['vibrationOff', 'vibrationSoft', 'vibrationStrong'];
            vibrationToggleButton.textContent = lang[vibKeys[vibrationLevel]];

            // Update dynamic text if visible
            if (transitionOverlay.classList.contains('visible')) {
                loadingText.textContent = lang.loading;
            }
        }

        function showDialogue(dialogueKey, duration) {
            if (dialogueBox.classList.contains('visible')) return;
            const message = translations[currentLanguage][dialogueKey] || "Dialogue not found.";
            dialogueBox.textContent = message;
            dialogueBox.classList.add('visible');
            setTimeout(() => {
                dialogueBox.classList.remove('visible');
            }, duration);
        }

        function triggerTransition(destinationId, spawnX = null) {
            if (isTransitioning) return;
            isTransitioning = true;

            loadingText.textContent = translations[currentLanguage].loading;
            transitionOverlay.classList.add('visible');

            setTimeout(() => {
                loadLevelById(destinationId, spawnX);

                setTimeout(() => {
                    transitionOverlay.classList.remove('visible');
                    isTransitioning = false;
                }, 1000); // Reduced transition time
            }, 400);
        }

        async function startGame() {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            try {
                await Promise.all([
                    loadAudio('pasos', 'assets/audio/characters/joziel/pasos-joziel.mp3'),
                    loadAudio('ambiente', 'assets/audio/ambience/dungeons/calabozo_de_piedra.mp3'),
                    loadAudio('puerta', 'assets/audio/puerta-calabozo.mp3'),
                    loadAudio('fantasma_lamento', 'assets/audio/voz-fantasma.mp3'),
                    loadAudio('jump', 'assets/audio/characters/joziel/jump.mp3'),
                    loadAudio('fireball_cast', 'assets/audio/characters/joziel/fireball_cast.mp3'),
                    loadAudio('fireball_impact', 'assets/audio/characters/joziel/fireball_impact.mp3'),
                    loadAudio('charge', 'assets/audio/characters/joziel/charge.mp3'),
                    loadAudio('hurt', 'assets/audio/characters/joziel/hurt.mp3'),
                    loadAudio('attack_voice', 'assets/audio/characters/joziel/attack_voice.mp3'),
                    loadAudio('thunder_strike', 'assets/audio/sfx/thunder_strike.mp3'),
                    loadAudio('thunder_distant', 'assets/audio/sfx/thunder_distant.mp3'),
                    loadAudio('enemy1_growl', 'assets/audio/enemigos/enemigo-1/movimiento.mp3'),
                    loadAudio('enemy1_step', 'assets/audio/enemigos/enemigo-1/pasos.mp3'),
                    loadAudio('enemy1_impact', 'assets/audio/enemigos/enemigo-1/impacto.mp3')
                ]);
            } catch (error) {
                console.error("Error loading audio", error);
            }
            playAudio('ambiente', true);
            setAudioVolume('ambiente', musicVolumeSlider.value);
            setAudioVolume('pasos', sfxVolumeSlider.value);

            menuScreen.style.opacity = 0;
            const onTransitionEnd = () => {
                menuScreen.style.display = 'none';
                document.getElementById('bg-canvas').style.display = 'block';
                document.getElementById('ui-container').style.display = 'flex';
                controlsContainer.style.opacity = '1';
                controlsContainer.style.pointerEvents = 'auto';
                player = new Player();
                window.player = player; // Debug exposure
                loadLevelById(currentLevelId);
                animate();
            };
            menuScreen.addEventListener('transitionend', onTransitionEnd, { once: true });
            // Fallback in case transitionend doesn't fire (e.g. tab inactive)
            setTimeout(() => {
                if (menuScreen.style.display !== 'none') {
                    menuScreen.removeEventListener('transitionend', onTransitionEnd);
                    onTransitionEnd();
                }
            }, 1000);
        }

        function pauseGame() {
            if (isPaused) return;
            isPaused = true;
            stopAudio('ambiente');
            stopAudio('pasos');
            cancelAnimationFrame(animationFrameId);
            pauseMenu.classList.add('active');
        }

        function resumeGame() {
            if (!isPaused) return;
            isPaused = false;
            playAudio('ambiente', true);
            pauseMenu.classList.remove('active');
            animate();
        }

        function handleLanguageChange(e) {
            currentLanguage = e.target.value;
            languageSelect.value = currentLanguage;
            pauseLanguageSelect.value = currentLanguage;
            updateUIText();
        }

        function toggleGamepadMode() {
            isGamepadModeActive = !isGamepadModeActive;
            controlsContainer.style.opacity = isGamepadModeActive ? '0' : '1';
            controlsContainer.style.pointerEvents = isGamepadModeActive ? 'none' : 'auto';
            updateUIText();
        }

        function toggleVibration() {
            vibrationLevel = (vibrationLevel + 1) % 3;
            if (vibrationLevel > 0 && navigator.vibrate) {
                navigator.vibrate(200);
            }
            updateUIText();
        }

        languageSelect.addEventListener('change', handleLanguageChange);
        pauseLanguageSelect.addEventListener('change', handleLanguageChange);

        playButton.addEventListener('click', startGame);
        jozielHalo.addEventListener('click', pauseGame);
        resumeButton.addEventListener('click', resumeGame);
        gamepadToggleButton.addEventListener('click', toggleGamepadMode);
        vibrationToggleButton.addEventListener('click', toggleVibration);
        musicVolumeSlider.addEventListener('input', (e) => setAudioVolume('ambiente', e.target.value));
        sfxVolumeSlider.addEventListener('input', (e) => setAudioVolume('pasos', e.target.value));

        continueButton.addEventListener('click', restartLevel);

        quitButton.addEventListener('click', () => {
            location.reload(); // Simple way to go back to the main menu
        });

        musicToggleButton.addEventListener('click', () => {
            if (audioSources['ambiente']) {
                stopAudio('ambiente');
                musicToggleButton.textContent = '▶';
            } else {
                playAudio('ambiente', true);
                musicToggleButton.textContent = '❚❚';
            }
        });
        sfxToggleButton.addEventListener('click', () => {
            if (audioSources['pasos']) {
                stopAudio('pasos');
                sfxToggleButton.textContent = '▶';
            } else {
                playAudio('pasos', true);
                sfxToggleButton.textContent = '❚❚';
            }
        });


        const joystickContainer = document.getElementById('joystick-container');
        const joystickKnob = document.getElementById('joystick-knob');
        let isDraggingJoystick = false;
        let joystickTouchId = null; // <-- NEW: To store the ID of the touch on the joystick
        let joystickRect;
        let joystickRadius;

        function updateJoystickDimensions() {
            if (joystickContainer) {
                joystickRect = joystickContainer.getBoundingClientRect();
                joystickRadius = joystickContainer.clientWidth / 2 - joystickKnob.clientWidth / 2;
            }
        }

        function moveJoystick(clientX, clientY) {
            let deltaX = clientX - (joystickRect.left + joystickRect.width / 2);
            let deltaY = clientY - (joystickRect.top + joystickRect.height / 2);
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > joystickRadius) {
                const angle = Math.atan2(deltaY, deltaX);
                deltaX = joystickRadius * Math.cos(angle);
                deltaY = joystickRadius * Math.sin(angle);
            }
            joystickKnob.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px)`;
            const deadZone = 10;
            if (joystickRadius > 0) {
                joyVector.x = Math.abs(deltaX) > deadZone ? deltaX / joystickRadius : 0;
                joyVector.y = Math.abs(deltaY) > deadZone ? -deltaY / joystickRadius : 0;
            } else {
                joyVector.x = 0;
                joyVector.y = 0;
            }
        }

        function resetJoystick() {
            joystickKnob.style.transition = 'transform 0.1s ease-out';
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            joyVector.set(0, 0);
        }

        // --- MOBILE-FRIENDLY JOYSTICK CONTROLS ---

        // Mouse Events (for desktop)
        joystickContainer.addEventListener('mousedown', (e) => {
            if (!isPaused && !isGamepadModeActive) {
                isDraggingJoystick = true;
                joystickKnob.style.transition = 'none';
                updateJoystickDimensions();
                moveJoystick(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingJoystick && joystickTouchId === null && !isGamepadModeActive) { // Only move if controlled by mouse
                moveJoystick(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingJoystick && joystickTouchId === null && !isGamepadModeActive) { // Only reset if controlled by mouse
                isDraggingJoystick = false;
                resetJoystick();
            }
        });

        // Touch Events (for mobile)
        joystickContainer.addEventListener('touchstart', (e) => {
            if (!isPaused && !isGamepadModeActive && joystickTouchId === null) { // Only start a new drag if not already dragging
                e.preventDefault();
                const touch = e.changedTouches[0]; // Get the touch that started
                joystickTouchId = touch.identifier; // Store its ID
                isDraggingJoystick = true;
                joystickKnob.style.transition = 'none';
                updateJoystickDimensions();
                moveJoystick(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (isDraggingJoystick && joystickTouchId !== null && !isGamepadModeActive) {
                e.preventDefault();
                // Find the touch that corresponds to our joystick drag
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === joystickTouchId) {
                        moveJoystick(touch.clientX, touch.clientY);
                        break;
                    }
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (isDraggingJoystick && joystickTouchId !== null && !isGamepadModeActive) {
                // Check if the touch that ended is the one we were tracking
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === joystickTouchId) {
                        isDraggingJoystick = false;
                        joystickTouchId = null; // Release the touch ID
                        resetJoystick();
                        break;
                    }
                }
            }
        });

        document.addEventListener('touchcancel', (e) => { // Also handle touchcancel
             if (isDraggingJoystick && joystickTouchId !== null && !isGamepadModeActive) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === joystickTouchId) {
                        isDraggingJoystick = false;
                        joystickTouchId = null;
                        resetJoystick();
                        break;
                    }
                }
            }
        });

        function handleAttackPressStart() {
            if (isPaused) return;
            isAttackButtonPressed = true;
            attackPressStartTime = Date.now();
            btnAttack.classList.add('button-active-aura'); // Activar efecto visual
            btnAttack.classList.add('pressed'); // Activar animación de pulsado
            triggerMobileVibration(200); // Vibrar inmediatamente al pulsar
        }
        function handleAttackPressEnd() {
            if (isPaused) return;
            isAttackButtonPressed = false;
            btnAttack.classList.remove('button-active-aura'); // Desactivar efecto visual
            btnAttack.classList.remove('pressed'); // Desactivar animación de pulsado
        }

        btnAttack.addEventListener('mousedown', () => {
             if (!isGamepadModeActive) {
                 handleAttackPressStart();
                 triggerMobileVibration(100);
             }
        });
        btnAttack.addEventListener('mouseup', () => !isGamepadModeActive && handleAttackPressEnd());
        btnAttack.addEventListener('mouseleave', () => !isGamepadModeActive && handleAttackPressEnd());

        btnAttack.addEventListener('touchstart', (e) => {
             if(!isGamepadModeActive) {
                 e.preventDefault();
                 handleAttackPressStart();
                 triggerMobileVibration(100);
             }
        }, { passive: false });
        btnAttack.addEventListener('touchend', () => !isGamepadModeActive && handleAttackPressEnd());

        btnShoot.addEventListener('mousedown', () => {
             if(!isPaused && !isGamepadModeActive) {
                 player.shoot(joyVector);
                 btnShoot.classList.add('button-active-aura');
                 btnShoot.classList.add('pressed');
                 triggerMobileVibration(50);
                 setTimeout(() => {
                     btnShoot.classList.remove('button-active-aura');
                     btnShoot.classList.remove('pressed');
                 }, 200);
             }
        });

        btnShoot.addEventListener('touchstart', (e) => {
             if(!isPaused && !isGamepadModeActive) {
                 e.preventDefault();
                 player.shoot(joyVector);
                 btnShoot.classList.add('button-active-aura');
                 btnShoot.classList.add('pressed');
                 triggerMobileVibration(50);
                 setTimeout(() => {
                     btnShoot.classList.remove('button-active-aura');
                     btnShoot.classList.remove('pressed');
                 }, 200);
             }
        }, { passive: false });


        doorPromptFlame.addEventListener('mousedown', (e) => { if (!isPaused) { e.preventDefault(); interactPressed = true; } });
        doorPromptFlame.addEventListener('touchstart', (e) => { if (!isPaused) { e.preventDefault(); interactPressed = true; } }, { passive: false });

        startButton.addEventListener('click', () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Lock orientation to landscape
            (async () => {
                try {
                    if (screen.orientation && typeof screen.orientation.lock === 'function') {
                        await screen.orientation.lock('landscape');
                    }
                } catch (err) {
                    console.error('Could not lock orientation:', err);
                }
            })();

            startButtonContainer.style.display = 'none';
            introImage.src = assetUrls.introImage;
            introScreen.style.opacity = 0;
            introScreen.addEventListener('transitionend', () => {
                introScreen.style.display = 'none';
                menuScreen.style.backgroundImage = `url('${assetUrls.menuBackgroundImage}')`;
                menuScreen.style.display = 'flex';
                setTimeout(() => menuScreen.style.opacity = 1, 10);
            }, { once: true });
        });

        function handleResize() {
            updateJoystickDimensions();
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;

            if (camera.aspect < 1) {
                camera.zoom = 1.2;
            } else {
                camera.zoom = 1.0;
            }

            camera.updateProjectionMatrix();
        }

        window.addEventListener('load', () => {
            updateUIText();
            handleResize();
        });
        window.addEventListener('resize', handleResize);

        window.addEventListener("gamepadconnected", (e) => {
            gamepadStatus.style.display = 'block';
            updateUIText();
        });
        window.addEventListener("gamepaddisconnected", (e) => {
            gamepadStatus.style.display = 'none';
        });

        function vibrateGamepad(duration = 50, strong = 0.8, weak = 0.8) {
            if (vibrationLevel === 0) return;

            const scale = vibrationLevel === 1 ? 0.5 : 1.0;
            const s = strong * scale;
            const w = weak * scale;

            // La vibración del navegador (móvil) se maneja mejor directamente en el evento táctil
            // Aquí dejamos la del gamepad y un fallback

            const gp = navigator.getGamepads()[0];
            if (gp && gp.vibrationActuator) {
                gp.vibrationActuator.playEffect("dual-rumble", {
                    startDelay: 0,
                    duration: duration,
                    weakMagnitude: w,
                    strongMagnitude: s,
                });
            }
        }

        // Función auxiliar para forzar la vibración en móviles
        function triggerMobileVibration(duration = 50) {
            if (vibrationLevel > 0 && navigator.vibrate) {
                navigator.vibrate(duration);
            }
        }

        function restartLevel() {
            if (!player) return;

            // Reset player state
            player.health = player.maxHealth;
            player.energyBarFill.style.width = '100%';
            player.mesh.position.set(0, player.mesh.geometry.parameters.height / 2, 0); // Reset position

            // Hide Game Over screen
            gameOverScreen.style.display = 'none';

            // Resume game logic
            isPaused = false;
            playAudio('ambiente', true);
            loadLevelById(currentLevelId); // Reload the current level
            animate();
        }

        function handleGamepadInput() {
            const gamepads = navigator.getGamepads();
            if (!gamepads[0]) return;
            const gp = gamepads[0];

            const deadzone = 0.2;
            const axisX = gp.axes[0];
            const axisY = gp.axes[1];
            joyVector.x = Math.abs(axisX) > deadzone ? axisX : 0;
            joyVector.y = Math.abs(axisY) > deadzone ? -axisY : 0;

            const shootNow = gp.buttons[0].pressed;
            if (shootNow && !prevGamepadButtons[0]) {
                player.shoot(joyVector);
            }
            prevGamepadButtons[0] = shootNow;

            const attackNow = gp.buttons[2].pressed;
            if (attackNow && !prevGamepadButtons[2]) {
                handleAttackPressStart();
            } else if (!attackNow && prevGamepadButtons[2]) {
                handleAttackPressEnd();
            }
            prevGamepadButtons[2] = attackNow;

            const interactNow = gp.buttons[3].pressed;
            if (interactNow && !prevGamepadButtons[3]) {
                interactPressed = true;
            }
            prevGamepadButtons[3] = interactNow;

            const pauseNow = gp.buttons[9].pressed;
            if (pauseNow && !prevGamepadButtons[9]) {
                isPaused ? resumeGame() : pauseGame();
            }
            prevGamepadButtons[9] = pauseNow;
        }

        class Player {
             constructor() {
                this.runningTexture = textureLoader.load(assetUrls.runningSprite);
                this.runningBackTexture = textureLoader.load(assetUrls.runningBackSprite);
                this.runningShadowTexture = textureLoader.load(assetUrls.runningShadowSprite);
                this.idleTexture = textureLoader.load(assetUrls.idleSprite);
                this.idleShadowTexture = textureLoader.load(assetUrls.idleShadowSprite);
                this.attackTexture = textureLoader.load(assetUrls.attackSprite);
                this.jumpTexture = textureLoader.load(assetUrls.jumpSprite);
        this.jumpBackTexture = textureLoader.load(assetUrls.jumpBackSprite);

                // Configurar texturas de correr (Grid 8x2)
                this.runningTexture.repeat.set(0.125, 0.5);
                this.runningBackTexture.repeat.set(0.125, 0.5); // Grid 8x2 igual
                this.runningShadowTexture.repeat.set(0.125, 0.5);

                // Configurar texturas de Idle (Strip 1x5)
                this.idleTexture.repeat.set(1 / totalIdleFrames, 1);
                this.idleShadowTexture.repeat.set(1 / totalIdleFrames, 1);

        // Configurar texturas de Salto
        // Right Jump: 3x2 Grid (6 frames) -> Cols 3 (0.333), Rows 2 (0.5)
        this.jumpTexture.repeat.set(1/3, 0.5);
        // Left Jump: 1x8 Strip (8 frames) -> Cols 8 (0.125), Rows 1 (1.0)
        this.jumpBackTexture.repeat.set(0.125, 1);

                // Mapeo de frames para la cuadrícula 8x2 (8 arriba, 1 abajo)
                // Row 1 (UV y=0.5) = Top, Row 0 (UV y=0.0) = Bottom
                this.runningFrameMap = [];
                // 8 frames arriba (0 a 7)
                for (let i = 0; i < 8; i++) {
                    this.runningFrameMap.push({ x: i * 0.125, y: 0.5 });
                }
                // 1 frame abajo (8)
                this.runningFrameMap.push({ x: 0, y: 0 });

                // Mapeo de frames para correr de espaldas (11 frames: 0-7 arriba, 8-10 abajo)
                this.runningBackFrameMap = [];
                for (let i = 0; i < 8; i++) {
                    this.runningBackFrameMap.push({ x: i * 0.125, y: 0.5 });
                }
                for (let i = 0; i < 3; i++) {
                    this.runningBackFrameMap.push({ x: i * 0.125, y: 0 });
                }

        // Mapeo de frames para Salto Derecho (3x2)
        // Top Row (0-2), Bottom Row (3-5)
        this.jumpFrameMap = [];
        for (let i = 0; i < 3; i++) this.jumpFrameMap.push({ x: i * (1/3), y: 0.5 }); // Top
        for (let i = 0; i < 3; i++) this.jumpFrameMap.push({ x: i * (1/3), y: 0.0 }); // Bottom

                this.attackTexture.repeat.x = 1 / totalAttackFrames;

                const playerHeight = 4.2;
                const playerWidth = 2.9; // Adjusted for 1011x371 sprite aspect ratio (approx 0.68)

                const playerGeometry = new THREE.PlaneGeometry(playerWidth, playerHeight);
                // Cambio a MeshBasicMaterial para mantener colores originales ("Full HD") sin verse afectado por luces/sombras
                const playerMaterial = new THREE.MeshBasicMaterial({
                    map: this.runningTexture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    alphaTest: 0.5
                });
                this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
                this.mesh.position.y = playerHeight / 2;
                this.mesh.scale.set(1.32, 1.32, 1); // Start with Idle scale
                this.mesh.castShadow = true;
                this.mesh.frustumCulled = false; // Optimization
                this.mesh.renderOrder = 0;
                scene.add(this.mesh);

                // Glow Mesh (Ojos Brillantes)
                // Usamos AdditiveBlending para que el fondo negro desaparezca y solo los ojos (blancos/grises) brillen con el color.
                const glowMaterial = new THREE.MeshBasicMaterial({
                    map: null, // Se asignará dinámicamente
                    color: 0x00FFFF, // Cian intenso
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide
                });

                // Opción alternativa solicitada (Emissive) si se prefiere sobre Basic+Additive:
                // const glowMaterial = new THREE.MeshStandardMaterial({
                //    map: null,
                //    color: 0x000000,
                //    emissive: 0x00FFFF,
                //    emissiveIntensity: 2.0,
                //    transparent: true,
                //    blending: THREE.AdditiveBlending, // Aún necesario para ignorar el negro de la textura jpg
                //    side: THREE.DoubleSide
                // });
                // Usamos Basic+Additive porque es el estándar para "efectos de brillo sobre sprite negro".

                this.glowMesh = new THREE.Mesh(playerGeometry, glowMaterial);
                this.glowMesh.position.set(0, 0, 0.05); // Ligeramente en frente para evitar Z-fighting
                this.glowMesh.frustumCulled = false; // Optimización
                this.mesh.add(this.glowMesh); // Hijo del mesh principal para heredar transformaciones

                // Volumetric Bloom (Feet Light) - Electric Cyan
                this.playerLight = new THREE.PointLight(0x00FFFF, 1.2, 12); // Intenso, rango medio
                scene.add(this.playerLight);

                // Floor Light (PointLight) - Replaces Floor Glow Sprite
                this.floorLight = new THREE.PointLight(0x00FFFF, 2.0, 15);
                this.floorLight.position.set(0, -2.0, 0); // Near feet
                this.mesh.add(this.floorLight);

                this.createAttackFlame();

                this.currentState = 'idle';
                this.currentFrame = 0;
                this.lastFrameTime = 0;
                this.isFacingLeft = false;
                this.isGrounded = true;
                this.velocity = new THREE.Vector3();
                this.jumpPower = 0.5;
                this.gravity = -0.025;
                this.isJumping = false;
                this.minPlayerX = -playableAreaWidth/2 + 1.5;
                this.maxPlayerX = playableAreaWidth/2 - 1.5;
                this.jumpInputReceived = false;
                this.shootCooldown = 0;
                this.shootCooldownDuration = 0.5;
                this.shootingTimer = 0;

                this.maxHealth = 100;
                this.health = this.maxHealth;
                this.energyBarFill = document.getElementById('energy-fill');

                this.isInvincible = false;
                this.invincibilityDuration = 2.0; // 2 segundos de invencibilidad
                this.invincibilityTimer = 0;
                this.isAbsorbing = false;

                this.maxPower = 100;
                this.power = this.maxPower;
                this.powerBarFill = document.getElementById('power-fill');
            }

            restoreHealth(amount) {
                this.health = Math.min(this.maxHealth, this.health + amount);
                this.energyBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
            }

            restorePower(amount) {
                this.power = Math.min(this.maxPower, this.power + amount);
                this.powerBarFill.style.width = `${(this.power / this.maxPower) * 100}%`;
            }

            restorePowerAndHealth() {
                // Deprecated, keeping for safety if called elsewhere, but we should use specific methods
                this.restoreHealth(this.maxHealth * 0.05);
                this.restorePower(this.maxPower * 0.05);
            }

            applyKnockback(enemy) {
                const knockbackForce = 0.4;
                const direction = this.mesh.position.x > enemy.mesh.position.x ? 1 : -1;
                this.velocity.x = direction * knockbackForce;
                // Pequeño impulso vertical para que se sienta más como un impacto
                if (this.isGrounded) {
                    this.velocity.y = 0.1;
                    this.isGrounded = false;
                }
            }

            takeDamage(amount, enemy) {
                if (this.isInvincible) return;

                this.health -= amount;
                this.isInvincible = true;
                this.invincibilityTimer = this.invincibilityDuration;
                playAudio('hurt', false, 0.9 + Math.random() * 0.2);

                // Recortar sonido 'hurt' a ~1 segundo con desvanecimiento
                if (gainNodes['hurt'] && audioSources['hurt']) {
                    const now = audioContext.currentTime;
                    gainNodes['hurt'].gain.setValueAtTime(0.5, now);
                    gainNodes['hurt'].gain.linearRampToValueAtTime(0, now + 1.0);
                    audioSources['hurt'].stop(now + 1.0);
                }

                this.applyKnockback(enemy);
                this.energyBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;

                if (this.health <= 0) {
                    this.health = 0;
                    // Game Over
                    gameOverScreen.style.display = 'flex';
                    isPaused = true;
                    stopAudio('ambiente');
                    stopAudio('pasos');
                    cancelAnimationFrame(animationFrameId);
                }
            }

            shoot(aimVector) {
                const powerCost = this.maxPower * 0.05;
                if (this.power < powerCost || this.shootCooldown > 0) return;

                this.power -= powerCost;
                this.powerBarFill.style.width = `${(this.power / this.maxPower) * 100}%`;

                if (this.shootCooldown > 0) return;
                vibrateGamepad(50, 0.5, 0.5);
                // Offset de 0.4s para saltar el silencio inicial
                playAudio('fireball_cast', false, 0.9 + Math.random() * 0.2, 0.5, 0.4);
                playAudio('attack_voice', false, 0.9 + Math.random() * 0.2);

                const startPosition = this.mesh.position.clone().add(new THREE.Vector3(0, 0.2, 0.5));
                let direction = new THREE.Vector2(this.isFacingLeft ? -1 : 1, 0);

                if (Math.abs(aimVector.y) > 0.3) {
                    direction.y = aimVector.y;
                }
                direction.normalize();

                allProjectiles.push(new Projectile(scene, startPosition, direction));
                this.shootCooldown = this.shootCooldownDuration;
                this.currentState = 'shooting';
                this.shootingTimer = 0.2;
            }

            createAttackFlame() {
                const flameGroup = new THREE.Group();
                const flameLight = new THREE.PointLight(0x00aaff, 1.5, 4);
                flameLight.castShadow = true;
                flameGroup.add(flameLight);
                const attackFlameMaterial = new THREE.MeshBasicMaterial({ map: textureLoader.load(assetUrls.flameParticle), color: 0xaaddff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                const flameCore = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), attackFlameMaterial);
                flameCore.frustumCulled = false; // Optimization
                flameGroup.add(flameCore);
                flameGroup.visible = false;
                this.mesh.add(flameGroup);
                this.rightHandFlame = flameGroup;
                this.rightHandFlame.position.set(-0.6, 0.3, 0.3);

                const leftHandFlame = flameGroup.clone();
                this.mesh.add(leftHandFlame);
                this.leftHandFlame = leftHandFlame;
                this.leftHandFlame.position.set(0.6, 0.3, 0.3);

                this.createAura();
            }

            createAura() {
                this.auraGroup = new THREE.Group();
                const auraTexture = textureLoader.load(assetUrls.flameParticle);
                const auraMaterial = new THREE.MeshBasicMaterial({
                    map: auraTexture,
                    color: 0x00ffff, // Cyan
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                });

                // Crear 6 llamas alrededor del personaje
                for (let i = 0; i < 6; i++) {
                    // Aumentamos el tamaño para cubrir el cuerpo (Player es 4.2x4.2)
                    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 6.0), auraMaterial);
                    sprite.frustumCulled = false; // Optimization
                    const angle = (i / 6) * Math.PI * 2;
                    // Ajustamos posición Y para que cubra desde abajo hasta arriba
                    sprite.position.set(Math.cos(angle) * 1.5, -0.5 + Math.random(), Math.sin(angle) * 0.5);
                    sprite.userData = {
                        angle: angle,
                        speed: 2.0 + Math.random(),
                        yOffset: Math.random() * 2,
                        initialY: 0.0 // Base centrada para cubrir todo el cuerpo
                    };
                    this.auraGroup.add(sprite);
                }

                this.auraGroup.visible = false;
                this.mesh.add(this.auraGroup);
            }

            updateAura(deltaTime) {
                if (!this.auraGroup.visible) return;

                // Rotar todo el grupo lentamente
                this.auraGroup.rotation.y += 2.0 * deltaTime;

                this.auraGroup.children.forEach(p => {
                     // Efecto de pulso y flotación
                     const time = Date.now() * 0.005;
                     const scale = 1.0 + Math.sin(time * p.userData.speed) * 0.3;
                     p.scale.set(scale, scale, scale);

                     // Movimiento vertical suave
                     p.position.y = p.userData.initialY + Math.sin(time + p.userData.angle) * 0.5;

                     // Que siempre miren a la cámara (billboard) para que se vean bien
                     p.lookAt(camera.position);
                });
            }

            updateAttackFlames() {
                [this.rightHandFlame, this.leftHandFlame].forEach(flame => {
                    const light = flame.children[0];
                    const core = flame.children[1];
                    light.intensity = 1.0 + Math.random() * 0.5;
                    const scale = 0.8 + Math.random() * 0.4;
                    core.scale.set(scale, scale, scale);
                    core.rotation.z += 0.1;
                });
            }

            update(deltaTime, controls) {
                const wasFacingLeft = this.isFacingLeft;
                this.isAbsorbing = controls.attackHeld;

                if (this.isInvincible) {
                    this.invincibilityTimer -= deltaTime;
                    // Efecto de parpadeo para la transparencia
                    this.mesh.material.opacity = (Math.floor(this.invincibilityTimer * 10) % 2 === 0) ? 0.5 : 1.0;

                    if (this.invincibilityTimer <= 0) {
                        this.isInvincible = false;
                        this.mesh.material.opacity = 1.0; // Restaurar opacidad completa
                    }
                }

                if (this.shootCooldown > 0) {
                    this.shootCooldown -= deltaTime;
                }
                if (this.shootingTimer > 0) {
                    this.shootingTimer -= deltaTime;
                    if (this.shootingTimer <= 0) {
                        this.currentState = 'idle';
                    }
                }

                const joyX = controls.joyVector.x;
                const joyY = controls.joyVector.y;
                const isMoving = Math.abs(joyX) > 0.1;
                const previousState = this.currentState;

                // Lógica de movimiento horizontal
                if (isMoving) {
                    this.velocity.x = moveSpeed * joyX;
                    this.isFacingLeft = joyX < 0;
                } else {
                    // Aplicar fricción si no hay entrada
                    this.velocity.x *= 0.9;
                }

                if (this.currentState !== 'shooting') {
                    // Prioridad de movimiento sobre carga
                    const isJumpingInput = joyY > 0.5;
                    // Consideramos movimiento si hay input significativo
                    const isMovingInput = Math.abs(joyX) > 0.1;

                    if (controls.attackHeld && !isMovingInput && !isJumpingInput) {
                        if (this.currentState !== 'attacking') {
                            vibrateGamepad(100, 0.8, 0.8);
                            // Volumen aumentado significativamente para 'charge'
                            playAudio('charge', true, 0.9 + Math.random() * 0.2, 4.0);
                        }
                        this.currentState = 'attacking';

                        // Regeneración lenta de poder (10 unidades/segundo)
                        if (this.power < this.maxPower) {
                            this.power += 10 * deltaTime;
                            if (this.power > this.maxPower) this.power = this.maxPower;
                            this.powerBarFill.style.width = `${(this.power / this.maxPower) * 100}%`;
                        }

                    } else {
                        // Si estábamos cargando y nos movemos, detener el audio de carga
                        if (audioSources['charge']) stopAudio('charge');

                        if (isJumpingInput && this.isGrounded && !this.jumpInputReceived) {
                            this.isJumping = true;
                            this.isGrounded = false;
                            this.velocity.y = this.jumpPower;
                            this.currentState = 'jumping';
            this.currentFrame = -1; // Force reset
                            this.jumpInputReceived = true;
                            // Offset de 0.1s para respuesta inmediata
                            playAudio('jump', false, 0.9 + Math.random() * 0.2, 0.5, 0.1);
                            vibrateGamepad(100, 0.5, 0.5);
                        } else if (!isJumpingInput) {
                            this.jumpInputReceived = false;
                        }

                        if (isMoving && !this.isJumping) {
                            this.currentState = 'running';
                            // Emit footstep particles
                            if (Math.random() < 0.3) { // Low density
                                 allFootstepParticles.push(new FootstepParticle(scene, this.mesh.position.x, 0.2, this.mesh.position.z));
                            }
        } else if (!this.isJumping && this.currentState !== 'landing') {
                            this.currentState = 'idle';
                        }
                    }
                } else {
                    if (audioSources['charge']) stopAudio('charge');
                }

                // Aplicar gravedad y velocidad vertical
                if (!this.isGrounded) this.velocity.y += this.gravity;
                this.mesh.position.y += this.velocity.y;

                // Aplicar velocidad horizontal
                this.mesh.position.x += this.velocity.x;

                if (this.mesh.position.y <= this.mesh.geometry.parameters.height / 2) {
                    this.mesh.position.y = this.mesh.geometry.parameters.height / 2;

            // Landing Logic
            if (!this.isGrounded) {
                this.isGrounded = true;
                this.isJumping = false;
                this.velocity.y = 0;

                const isMovingInput = Math.abs(controls.joyVector.x) > 0.1;
                const isJumpingInput = controls.joyVector.y > 0.5;

                // Priority: If moving or jumping, skip landing animation
                if (isMovingInput || isJumpingInput) {
                     // Transition handled next frame by input logic
                     this.currentState = 'idle'; // Reset safely
                } else {
                     this.currentState = 'landing';
                     this.currentFrame = -1; // Will start at 0
                }
            }
                }

                this.mesh.position.x = Math.max(this.minPlayerX, Math.min(this.maxPlayerX, this.mesh.position.x));

                // Rotación del personaje
                if (this.isFacingLeft && (this.currentState === 'running' || this.currentState === 'jumping' || this.currentState === 'landing')) {
                     // Caso especial: Running, Jumping, Landing Left usa sprites (Movimiento-B, saltar-b) que ya están orientados a la izquierda
                     this.mesh.rotation.y = 0;
                } else {
                     this.mesh.rotation.y = this.isFacingLeft ? Math.PI : 0;
                }

                // Camera follow logic
                camera.position.x = this.mesh.position.x;
                const targetCameraY = this.mesh.position.y + 1.9; // Maintain initial offset
                camera.position.y += (targetCameraY - camera.position.y) * 0.05; // Smoothly interpolate

                this.playerLight.position.set(this.mesh.position.x, this.mesh.position.y + 1, this.mesh.position.z + 2);

                if (this.currentState !== previousState) this.currentFrame = -1;

                const isAttacking = this.currentState === 'attacking';
                this.rightHandFlame.visible = isAttacking;
                this.leftHandFlame.visible = isAttacking;
                this.auraGroup.visible = isAttacking;

                if (isAttacking) {
                    this.updateAttackFlames();
                    this.updateAura(deltaTime);
                }

        // Velocidad variable según el estado
        let currentAnimSpeed = animationSpeed;
        if (this.currentState === 'idle') currentAnimSpeed = idleAnimationSpeed;
        // Faster Jump for Left side (Movimiento-B) to match duration
        if ((this.currentState === 'jumping' || this.currentState === 'landing') && this.isFacingLeft) {
            currentAnimSpeed = 60;
        }

                const stateChanged = this.currentState !== previousState;
        const directionChanged = (this.currentState === 'running' || this.currentState === 'jumping' || this.currentState === 'landing') && this.isFacingLeft !== wasFacingLeft;

        if (stateChanged || directionChanged) {
             // Scale Logic Adjustment
             if (this.currentState === 'idle') {
                        this.mesh.scale.set(1.32, 1.32, 1);
             } else if ((this.currentState === 'jumping' || this.currentState === 'landing') && !this.isFacingLeft) {
                // Right Jump/Land -> Scale Down
                this.mesh.scale.set(0.88, 0.88, 1);
             } else {
                // Standard for Running, Attacking, and Left Jump
                        this.mesh.scale.set(1.15, 1.15, 1);
             }
                }

                if (stateChanged || directionChanged) {
                    this.currentFrame = -1;
                    this.lastFrameTime = 0; // Force immediate update

                    if (this.currentState === 'running' && this.isFacingLeft && wasFacingLeft) {
                        this.currentFrame = 2; // Start at frame 3 (next increment will be 3)
                    }
                }

                if (Date.now() - this.lastFrameTime > currentAnimSpeed) {
                    this.lastFrameTime = Date.now();
                    let totalFrames, currentTexture, shadowTexture;
                    let isGridSprite = false;
            let isJumpSprite = false;

                    switch (this.currentState) {
                        case 'shooting':
                            [totalFrames, currentTexture, shadowTexture] = [totalAttackFrames, this.attackTexture, null];
                            this.currentFrame = 2;
                            break;
                        case 'attacking':
                            [totalFrames, currentTexture, shadowTexture] = [totalAttackFrames, this.attackTexture, null];
                            if (this.currentFrame < totalFrames - 1) this.currentFrame++;
                            break;
                        case 'running':
                            if (this.isFacingLeft) {
                                // Lógica especial Running Left (Movimiento-B / Espalda)
                                totalFrames = 11;
                                currentTexture = this.runningBackTexture;
                                shadowTexture = this.runningShadowTexture;

                                this.currentFrame++;
                                if (this.currentFrame >= totalFrames) {
                                    this.currentFrame = 5;
                                }
                                isGridSprite = true;
                            } else {
                                // Running Right (Estándar)
                                [totalFrames, currentTexture, shadowTexture] = [totalRunningFrames, this.runningTexture, this.runningShadowTexture];
                                this.currentFrame++;
                                if (this.currentFrame >= totalFrames) {
                            this.currentFrame = 2;
                                }
                                isGridSprite = true;
                            }
                            break;
                        case 'jumping':
                     if (this.isFacingLeft) {
                        // Left Jump (Reverse Read: 7->0)
                        currentTexture = this.jumpBackTexture;
                        shadowTexture = this.runningShadowTexture;

                        if (this.velocity.y > 0) {
                            // Rising Phase (7 -> 3)
                            if (this.currentFrame === -1) this.currentFrame = 7;
                            else this.currentFrame--;

                            // Prevent entering the falling frame (2) while still rising
                            if (this.currentFrame < 3) this.currentFrame = 3;
                        } else {
                            // Falling Phase (Hold Frame 2)
                            this.currentFrame = 2;
                        }

                     } else {
                        // Right Jump (Modified Logic: 0 -> 2 (Rise) -> 1 (Fall))
                        currentTexture = this.jumpTexture;
                        shadowTexture = this.runningShadowTexture;
                        isJumpSprite = true;

                        if (this.currentFrame === -1) {
                            this.currentFrame = 0; // Start at 0
                        } else if (this.currentFrame === 0) {
                             this.currentFrame = 2; // Move to 2 after 0 completes
                        } else if (this.velocity.y > 0) {
                             this.currentFrame = 2; // Hold 2 while rising
                        } else {
                             this.currentFrame = 1; // Hold 1 while falling
                        }
                     }
                     break;

                case 'landing':
                    if (this.isFacingLeft) {
                        // Left Land (Reverse Read: 2->0)
                        currentTexture = this.jumpBackTexture;
                        shadowTexture = this.runningShadowTexture;

                        if (this.currentFrame === -1 || this.currentFrame > 2) this.currentFrame = 2;
                        else this.currentFrame--;

                        if (this.currentFrame < 0) {
                            this.currentState = 'idle'; // End of land
                        }
                    } else {
                        // Right Land (Forward Read: 3->4->5)
                        currentTexture = this.jumpTexture;
                        shadowTexture = this.runningShadowTexture;
                        isJumpSprite = true;

                        if (this.currentFrame === -1 || this.currentFrame < 3) this.currentFrame = 3;
                        else this.currentFrame++;

                        if (this.currentFrame > 5) {
                            this.currentState = 'idle';
                        }
                    }
                            break;

                        case 'idle':
                            [totalFrames, currentTexture, shadowTexture] = [totalIdleFrames, this.idleTexture, this.idleShadowTexture];
                            this.currentFrame = (this.currentFrame + 1) % totalFrames;
                            break;
                        default:
                            // Fallback a idle si algo falla
                            [totalFrames, currentTexture, shadowTexture] = [totalIdleFrames, this.idleTexture, this.idleShadowTexture];
                            this.currentFrame = 0;
                            break;
                    }

                    if (currentTexture) {
                        this.mesh.material.map = currentTexture;

                        if (isGridSprite) {
                            // Seleccionar el mapa correcto
                            let frameMap = this.runningFrameMap;
                            if (this.isFacingLeft && this.currentState === 'running') {
                                frameMap = this.runningBackFrameMap;
                            }

                            // Usar el mapa de coordenadas
                            const frameData = frameMap[this.currentFrame];
                            if (frameData) {
                                currentTexture.offset.set(frameData.x, frameData.y);
                            }
                } else if (isJumpSprite) {
                    // Use Jump Frame Map for Right Jump
                     const frameData = this.jumpFrameMap[this.currentFrame];
                     if (frameData) {
                         currentTexture.offset.set(frameData.x, frameData.y);
                     }
                        } else {
                    // Comportamiento lineal estándar (Idle, Attack, Left Jump Strip)
                    // Note: Left Jump/Land uses strip (1x8) logic, which matches this
                    // Total frames for Left Jump Strip is 8
                    const framesInStrip = (currentTexture === this.jumpBackTexture) ? 8 : totalFrames;

                    const uOffset = this.currentFrame / framesInStrip;
                            currentTexture.offset.x = uOffset;
                            currentTexture.offset.y = 0;
                        }
                    }

                    // Actualizar Glow Mesh (Ojos)
                    if (shadowTexture) {
                        this.glowMesh.visible = true;
                        if (this.glowMesh.material.map !== shadowTexture) {
                            this.glowMesh.material.map = shadowTexture;
                        }

                        // Lógica especial para mapear la sombra cuando se corre a la izquierda
                        // Movimiento-B usa frames 5-10 (6 frames) en bucle.
                        // Sombra-correr tiene 9 frames (0-8). Queremos usar los "últimos 4" (5, 6, 7, 8).
                        if (this.isFacingLeft && this.currentState === 'running') {
                            this.glowMesh.scale.x = -1; // Espejo (mirar izquierda)

                            // Mapear los frames de Movimiento-B (5..10) a los frames de Sombra (5..8)
                            // Ciclo simple: 5->5, 6->6, 7->7, 8->8, 9->5, 10->6...
                            // Offset base de sombra es 5.
                            // Frame relativo de animación: (this.currentFrame - 5)
                            // Frame relativo de sombra: (this.currentFrame - 5) % 4
                            // Frame absoluto de sombra: 5 + (...)

                            // Si estamos en arranque (0-4), no mostrar sombra o usar frame 5?
                            // El usuario dijo "solo está activando cuando Mira o cuando va hacia la derecha y cuando Mira a la izquierda o camina a la izquierda ya no activa"
                            // y "ayúdame a revisar que sean los últimos Sprint los cuatro últimos".
                            // Asumiremos que solo activamos en el loop (>=5).

                            if (this.currentFrame >= 5) {
                                const shadowFrameIndex = 5 + ((this.currentFrame - 5) % 4);
                                const shadowFrameData = this.runningFrameMap[shadowFrameIndex]; // Usamos el mapa de la textura original (running)

                                if (shadowFrameData) {
                                    this.glowMesh.material.map.offset.set(shadowFrameData.x, shadowFrameData.y);
                                }
                                // Asegurar que el repeat sea el correcto (de runningTexture)
                                this.glowMesh.material.map.repeat.set(0.125, 0.5);
                            } else {
                                // En frames de arranque de Movimiento-B (0-4) ocultamos los ojos si no hay correspondencia clara
                                this.glowMesh.visible = false;
                            }

                        } else {
                            this.glowMesh.scale.x = 1; // Normal
                            // Sincronizar offset y repeat con la textura principal (Standard logic)
                            if (currentTexture) {
                                this.glowMesh.material.map.repeat.copy(currentTexture.repeat);
                                this.glowMesh.material.map.offset.copy(currentTexture.offset);
                            }
                        }
                    } else {
                        this.glowMesh.visible = false;
                    }
                }
            }
        }

        const wallTexture = textureLoader.load(assetUrls.wallTexture);
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, color: 0x454555 });
        const doorTexture = textureLoader.load(assetUrls.doorTexture);
        const doorMaterial = new THREE.MeshStandardMaterial({
            map: doorTexture,
            transparent: true,
            alphaTest: 0.5,
            emissive: 0x000000,
            emissiveIntensity: 0
        });

        // Shadow for Door Base
        function createShadowTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
            gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 128, 128);
            return new THREE.CanvasTexture(canvas);
        }
        const doorShadowTexture = createShadowTexture();
        const doorShadowMaterial = new THREE.MeshBasicMaterial({
            map: doorShadowTexture,
            transparent: true,
            depthWrite: false
        });

        const floorTexture = textureLoader.load(assetUrls.wallTexture);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(30, 2);
        const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
        const torchTexture = textureLoader.load(assetUrls.torchTexture);
        const torchMaterial = new THREE.MeshStandardMaterial({ map: torchTexture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const floorGeometry = new THREE.PlaneGeometry(playableAreaWidth, roomDepth);

        // --- Procedural Texturing (Dirt/Decals) ---
        function generateNoiseTexture() {
            const size = 128;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, size, size);

            for (let i = 0; i < 200; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const r = Math.random() * 5 + 1;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 100, 100, ${Math.random() * 0.5})`;
                ctx.fill();
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            return texture;
        }

        const dirtTexture = generateNoiseTexture();
        const dirtMaterial = new THREE.MeshBasicMaterial({
            map: dirtTexture,
            transparent: true,
            opacity: 0.6,
            blending: THREE.MultiplyBlending, // Darkens the background
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // --- Atmospheric Effects (God Rays & Dust) ---

        function createGodRayTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            // Gradient: Top (Cyan/White) -> Bottom (Transparent)
            const gradient = ctx.createLinearGradient(0, 0, 0, 256);
            gradient.addColorStop(0, 'rgba(200, 255, 255, 0.3)'); // Pale Cyan, transparent
            gradient.addColorStop(0.4, 'rgba(200, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 256);

            return new THREE.CanvasTexture(canvas);
        }

        const godRayTexture = createGodRayTexture();
        const godRayMaterial = new THREE.MeshBasicMaterial({
            map: godRayTexture,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        function createGodRays(scene) {
            // 2-3 rays fixed in the world (Simulated Light Shafts)
            const rayGeometry = new THREE.PlaneGeometry(12, 40);

            // Fixed coordinates mimicking cracks in the ceiling
            const positions = [
                { x: -20, z: -10, rotZ: 0.1 },
                { x: 10, z: -12, rotZ: -0.15 },
                { x: 45, z: -8, rotZ: 0.05 }
            ];

            positions.forEach(pos => {
                const ray = new THREE.Mesh(rayGeometry, godRayMaterial);
                ray.position.set(pos.x, 15, camera.position.z - roomDepth + 2); // High up, slightly in front of wall
                ray.rotation.z = pos.rotZ;
                ray.frustumCulled = false; // Optimization
                scene.add(ray);
            });
        }

        class DustSystem {
            constructor(scene) {
                this.scene = scene;
        this.count = 200; // Adjusted for larger particles

                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(this.count * 3);
                this.velocities = [];
        this.phases = [];

                for (let i = 0; i < this.count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * playableAreaWidth;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = camera.position.z - roomDepth + Math.random() * 15;

                    this.velocities.push({
                y: -(Math.random() * 0.01 + 0.005) // Fall slowly
                    });
            this.phases.push(Math.random() * Math.PI * 2);
                }

                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

                const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            map: textureLoader.load(assetUrls.dustParticle),
                    transparent: true,
            opacity: 0.4,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            alphaTest: 0.01
                });

                this.points = new THREE.Points(geometry, material);
        this.points.frustumCulled = true; // Optimization: Enable Frustum Culling
        // Ensure bounding sphere covers the area so it doesn't disappear unexpectedly
        geometry.computeBoundingSphere();
        // Manually expand to cover potential movement
        geometry.boundingSphere.radius = 100;
                this.scene.add(this.points);
            }

            setLightningState(intensity) {
                // Manual reaction to lightning
                // Intensity > 0 implies lightning strike
                if (intensity > 1.0) {
                     this.points.material.opacity = 0.8; // Boost opacity
                     this.points.material.color.setHex(0xaaddff); // Tint Blue
                } else {
                     this.points.material.opacity = 0.4; // Reset to base (0.4 requested)
                     this.points.material.color.setHex(0xffffff); // Reset to White
                }
            }

            update() {
                const positions = this.points.geometry.attributes.position.array;
        const time = Date.now() * 0.001;

                for (let i = 0; i < this.count; i++) {
            // Swaying movement (simulating air draft)
            const sway = Math.sin(time + this.phases[i]) * 0.02;
            positions[i * 3] += sway;

            // Falling movement
                    positions[i * 3 + 1] += this.velocities[i].y;

            // Wrap around Y (vertical)
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 1] = 20;
                positions[i * 3] = (Math.random() - 0.5) * playableAreaWidth; // Randomize X on respawn
            }

            // Wrap around X (horizontal boundaries)
                    const halfWidth = playableAreaWidth / 2;
                    if (positions[i * 3] > halfWidth) positions[i * 3] = -halfWidth;
                    if (positions[i * 3] < -halfWidth) positions[i * 3] = halfWidth;
                }
                this.points.geometry.attributes.position.needsUpdate = true;
            }
        }

        function addDecals(scene, levelData) {
            // Randomly place dirt patches on the back wall
            for (let i = 0; i < 15; i++) {
                const width = Math.random() * 5 + 3;
                const height = Math.random() * 5 + 3;
                const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, height), dirtMaterial);

                const x = (Math.random() - 0.5) * playableAreaWidth;
                const y = Math.random() * 10 + 2;
                // Slightly in front of the wall (wall is at camera.position.z - roomDepth)
                const z = camera.position.z - roomDepth + 0.1;

                decal.position.set(x, y, z);
                decal.rotation.z = Math.random() * Math.PI;
                decal.frustumCulled = false; // Optimization
                scene.add(decal);
            }

             // Randomly place dirt patches on the floor
             for (let i = 0; i < 15; i++) {
                const width = Math.random() * 5 + 3;
                const height = Math.random() * 5 + 3;
                const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, height), dirtMaterial);

                const x = (Math.random() - 0.5) * playableAreaWidth;
                // Floor is at -roomDepth/2 relative to camera Z roughly, but simpler to place on XZ plane
                // Floor mesh is at z: camera.position.z - (roomDepth / 2)
                const zCenter = camera.position.z - (roomDepth / 2);
                const z = zCenter + (Math.random() - 0.5) * roomDepth;

                decal.rotation.x = -Math.PI / 2;
                decal.position.set(x, 0.05, z); // Slightly above floor (y=0)
                decal.rotation.z = Math.random() * Math.PI;
                decal.frustumCulled = false; // Optimization
                scene.add(decal);
            }
        }

        function clearSceneForLevelLoad() {
            for (let i = scene.children.length - 1; i >= 0; i--) {
                const obj = scene.children[i];
                if (obj !== player.mesh && obj !== player.playerLight && !(obj instanceof THREE.Camera) && !(obj instanceof THREE.Light)) {
                    scene.remove(obj);
                }
            }
            allFlames.length = 0;
            allFootstepParticles.length = 0;
            allSpecters.length = 0;
            allSimpleEnemies.forEach(enemy => {
                 if (enemy.stopAudio) enemy.stopAudio();
                 scene.remove(enemy.mesh);
            });
            allSimpleEnemies.length = 0;
            allGates.length = 0;
            allStatues.length = 0;
            allOrbs.length = 0;
            allPuzzles.length = 0;
            numeralsContainer.innerHTML = '';
        }

        class AmbientTorchFlame {
            constructor(scene, position) {
                this.scene = scene;
                this.position = position;

                // Create a unique material per torch to allow individual opacity flickering
                // Texture is shared (from cache)
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: textureLoader.load(assetUrls.flameParticle),
                    color: 0x00aaff, // Cian/Azul (Pesadilla)
                    transparent: true,
                    blending: THREE.AdditiveBlending
                });

                this.sprite = new THREE.Sprite(spriteMaterial);
                this.sprite.position.copy(position);
                this.sprite.scale.set(1.5, 1.5, 1.5);
                this.sprite.frustumCulled = false; // Optimization: Enable Frustum Culling
                this.scene.add(this.sprite);

                this.light = new THREE.PointLight(0x00aaff, 1.5, 12);
                this.light.position.copy(position);
                this.scene.add(this.light);

                this.initialScale = 1.5;
                this.timeOffset = Math.random() * 100;
            }

            update(deltaTime) {
                const time = Date.now() * 0.005 + this.timeOffset;

                // Wind Simulation (Scale Noise)
                const scaleNoise = Math.sin(time * 3) * 0.15 + Math.cos(time * 7) * 0.05;
                const newScale = this.initialScale + scaleNoise;
                this.sprite.scale.set(newScale, newScale, 1.0);

                // Opacity Flicker
                this.sprite.material.opacity = 0.8 + Math.sin(time * 12) * 0.15 + Math.random() * 0.05;

                // Light Intensity Flicker
                this.light.intensity = 1.5 + Math.sin(time * 10) * 0.3 + Math.random() * 0.2;

                return true; // Always active
            }
        }

        function createTorch(x, y, z, isLit) {
            const torchMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8), torchMaterial);
            torchMesh.position.set(x, y, z);
            torchMesh.frustumCulled = false; // Optimization
            scene.add(torchMesh);
            if (isLit) {
                // Use the new AmbientTorchFlame (Orange/Warm) instead of RealisticFlame (Blue)
                allFlames.push(new AmbientTorchFlame(scene, new THREE.Vector3(x, y + 1.3, z + 0.2)));
            }
        }

        function areAllRoomsComplete() {
            return Object.values(completedRooms).every(status => status === true);
        }

        function loadLevel(levelData) {
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.z = camera.position.z - (roomDepth / 2);
            floor.receiveShadow = true;
            floor.frustumCulled = false; // Optimization
            scene.add(floor);

            const wall = new THREE.Mesh(new THREE.PlaneGeometry(playableAreaWidth, 20), wallMaterial);
            wall.position.set(0, 10, camera.position.z - roomDepth);
            wall.frustumCulled = false; // Optimization
            scene.add(wall);

            const sideWallGeometry = new THREE.PlaneGeometry(roomDepth, 20);
            const leftSideWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
            leftSideWall.rotation.y = Math.PI / 2;
            leftSideWall.position.set(-playableAreaWidth / 2, 10, camera.position.z - roomDepth / 2);
            leftSideWall.frustumCulled = false; // Optimization
            scene.add(leftSideWall);
            const rightSideWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
            rightSideWall.rotation.y = -Math.PI / 2;
            rightSideWall.position.set(playableAreaWidth / 2, 10, camera.position.z - roomDepth / 2);
            rightSideWall.frustumCulled = false; // Optimization
            scene.add(rightSideWall);

            levelData.gates.forEach(gateData => {
                if (gateData.id === 'gate_boss' && !areAllRoomsComplete()) {
                    return;
                }

                const gateGroup = new THREE.Group();
                const gateMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), doorMaterial.clone());
                gateMesh.position.set(0, 4, 0.3);
                gateMesh.frustumCulled = false; // Optimization
                gateGroup.add(gateMesh);

                // Shadow Mesh at Base
                const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), doorShadowMaterial);
                shadowMesh.rotation.x = -Math.PI / 2;
                shadowMesh.position.set(0, 0.1, 1.0); // Slightly above floor and in front of door
                shadowMesh.frustumCulled = false; // Optimization
                gateGroup.add(shadowMesh);

                gateGroup.position.x = gateData.x;
                gateGroup.position.z = camera.position.z - roomDepth;
                scene.add(gateGroup);

                const numeralElement = document.createElement('div');
                numeralElement.className = 'door-numeral';
                numeralElement.textContent = gateData.numeral;

                let isLit = completedRooms[gateData.destination];
                if (levelData.id !== 'dungeon_1') {
                    isLit = true;
                }

                if (!isLit) {
                    numeralElement.classList.add('off');
                }

                numeralsContainer.appendChild(numeralElement);

                allGates.push({ mesh: gateGroup, id: gateData.id, destination: gateData.destination, numeralElement: numeralElement });
                createTorch(gateData.x - 6, 3.2, camera.position.z - roomDepth + 0.5, isLit);
                createTorch(gateData.x + 6, 3.2, camera.position.z - roomDepth + 0.5, isLit);
            });

            levelData.specters.forEach(specterData => {
                allSpecters.push(new Specter(scene, specterData.x, specterData.y));
            });

            if (levelData.puzzles) {
                levelData.puzzles.forEach(puzzleData => {
                    allPuzzles.push(new Puzzle(scene, puzzleData.x, levelData.id));
                });
            }

            if (levelData.statues) {
                levelData.statues.forEach(statueData => {
                    allStatues.push(new Statue(
                        scene,
                        statueData.x,
                        statueData.y,
                        camera.position.z - roomDepth + 2,
                        statueData.textureUrl,
                        statueData.dialogueKey // Pass the key, not the translated string
                    ));
                });
            }

            addDecals(scene, levelData);
            createGodRays(scene);
            dustSystem = new DustSystem(scene);
        }

        function loadLevelById(levelId, spawnX = null) {
            const levelData = MAPS[levelId];
            if (!levelData) return;
            currentLevelId = levelId;
            clearSceneForLevelLoad();
            loadLevel(levelData);

            if (levelId === 'room_3') {
                if (allSimpleEnemies.length === 0) {
                    allSimpleEnemies.push(new SimpleEnemy(scene, 0));
                }
            }

            if (player) {
                player.mesh.position.x = spawnX !== null ? spawnX : 0;
                player.mesh.position.y = player.mesh.geometry.parameters.height / 2;
                player.mesh.position.z = 0;
                camera.position.x = player.mesh.position.x;
            }
        }

        const MAPS = {
            dungeon_1: {
                id: 'dungeon_1',
                name: 'El Salón Principal',
                gates: [
                    { id: 'gate_1', x: -50, destination: 'room_1', numeral: 'I' },
                    { id: 'gate_2', x: -30, destination: 'room_2', numeral: 'II' },
                    { id: 'gate_3', x: -10, destination: 'room_3', numeral: 'III' },
                    { id: 'gate_4', x: 10, destination: 'room_4', numeral: 'IV' },
                    { id: 'gate_5', x: 30, destination: 'room_5', numeral: 'V' },
                    { id: 'gate_boss', x: 55, destination: 'boss_room', numeral: 'VI' },
                ],
                specters: [ { type: 'fear', x: 45, y: 3.5 } ],
            },
            room_1: { id: 'room_1', name: 'Habitación 1', gates: [{ id: 'return_1', x: 0, destination: 'dungeon_1', numeral: 'I' }], specters: [], puzzles: [{x: 15}] },
            room_2: { id: 'room_2', name: 'Habitación 2', gates: [{ id: 'return_2', x: 0, destination: 'dungeon_1', numeral: 'II' }], specters: [] },
            room_3: { id: 'room_3', name: 'Habitación 3', gates: [{ id: 'return_3', x: 0, destination: 'dungeon_1', numeral: 'III' }], specters: [] },
            room_4: { id: 'room_4', name: 'Habitación 4', gates: [{ id: 'return_4', x: 0, destination: 'dungeon_1', numeral: 'IV' }], specters: [] },
            room_5: {
                id: 'room_5',
                name: 'Habitación 5',
                gates: [{ id: 'return_5', x: 0, destination: 'dungeon_1', numeral: 'V' }],
                specters: []
            },
            boss_room: { id: 'boss_room', name: 'Sala del Jefe', gates: [{ id: 'return_boss', x: 0, destination: 'dungeon_1', numeral: 'VI' }], specters: [] },
        };

        let sharedFlameMaterial = null;
        let sharedHealthMaterial = null;
        let sharedPowerMaterial = null;
        let sharedFootstepMaterial = null;

        class FootstepParticle {
            constructor(scene, x, y, z) {
                this.scene = scene;
                if (!sharedFootstepMaterial) {
                     sharedFootstepMaterial = new THREE.SpriteMaterial({
                        map: textureLoader.load(assetUrls.flameParticle),
                        color: 0x00FFFF,
                        transparent: true,
                        opacity: 0.6,
                        blending: THREE.AdditiveBlending
                    });
                }
                this.sprite = new THREE.Sprite(sharedFootstepMaterial);
                this.sprite.position.set(x + (Math.random() - 0.5) * 1.0, y + 0.2, z + (Math.random() - 0.5) * 0.5);
                this.sprite.scale.set(0.5, 0.5, 0.5); // Small
                this.sprite.frustumCulled = false; // Optimization
                this.scene.add(this.sprite);

                this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, Math.random() * 0.05, 0);
                this.lifetime = 0.5 + Math.random() * 0.3; // Short life
                this.maxLifetime = this.lifetime;
            }

            update(deltaTime) {
                this.lifetime -= deltaTime;
                if (this.lifetime <= 0) {
                    this.scene.remove(this.sprite);
                    return false;
                }

                this.sprite.position.add(this.velocity);
                this.sprite.material.opacity = (this.lifetime / this.maxLifetime) * 0.6;

                return true;
            }
        }

        class RealisticFlame {
            constructor(scene, position, lifetime = -1) {
                this.scene = scene;
                this.position = position;
                this.particleCount = 20;
                this.velocities = [];
                this.lifetime = lifetime; // -1 para vida infinita (antorchas)
                this.initialLifetime = lifetime;
                this.init();
            }

            init() {
                if (!sharedFlameMaterial) {
                    sharedFlameMaterial = new THREE.PointsMaterial({
                        color: 0x00aaff,
                        size: 0.4,
                        map: textureLoader.load(assetUrls.flameParticle),
                        blending: THREE.AdditiveBlending,
                        transparent: true,
                        depthWrite: false
                    });
                }
                const particleGeometry = new THREE.BufferGeometry();
                const positions = new Float32Array(this.particleCount * 3);
                for (let i = 0; i < this.particleCount; i++) {
                    positions[i * 3] = this.position.x;
                    positions[i * 3 + 1] = this.position.y;
                    positions[i * 3 + 2] = this.position.z;
                    this.velocities.push({ x: (Math.random() - 0.5) * 0.02, y: Math.random() * 0.1, z: (Math.random() - 0.5) * 0.02, lifetime: Math.random() * 2 });
                }
                particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                this.particles = new THREE.Points(particleGeometry, sharedFlameMaterial);
                this.particles.frustumCulled = false; // Optimization
                this.scene.add(this.particles);
                this.light = new THREE.PointLight(0x00aaff, 2.0, 20);
                this.light.position.copy(this.position);
                this.light.castShadow = true;
                this.scene.add(this.light);
            }

            update(deltaTime) {
                if (this.lifetime > 0) {
                    this.lifetime -= deltaTime;
                    if (this.lifetime <= 0) {
                        this.scene.remove(this.particles);
                        this.scene.remove(this.light);
                        return false; // Indicar que la llama ha expirado
                    }
                    // Desvanecimiento
                    const fade = this.lifetime / this.initialLifetime;
                    this.particles.material.opacity = fade;
                    this.light.intensity = (1.0 + Math.sin(Date.now() * 0.01 + this.position.x) * 0.5) * fade;
                } else {
                     this.light.intensity = 1.0 + Math.sin(Date.now() * 0.01 + this.position.x) * 0.5;
                }

                const positions = this.particles.geometry.attributes.position.array;
                for (let i = 0; i < this.particleCount; i++) {
                    const vel = this.velocities[i];
                    vel.lifetime -= deltaTime;
                    if (vel.lifetime <= 0) {
                        positions[i * 3] = this.position.x;
                        positions[i * 3 + 1] = this.position.y;
                        positions[i * 3 + 2] = this.position.z;
                        vel.lifetime = Math.random() * 2;
                        vel.y = Math.random() * 0.1;
                    }
                    positions[i * 3] += vel.x;
                    positions[i * 3 + 1] += vel.y;
                    positions[i * 3 + 2] += vel.z;
                }
                this.particles.geometry.attributes.position.needsUpdate = true;
                return true; // La llama sigue activa
            }
        }

        class Specter {
            constructor(scene, initialX, initialY) {
                this.scene = scene;
                this.initialX = initialX;
                this.floatingCenterY = initialY;
                this.state = 'IDLE';
                this.stateTimer = Math.random() * 2 + 2;
                this.targetPosition = new THREE.Vector3();
                this.moveSpeed = 0.05;
                this.lastFrameTime = 0;
                this.currentFrame = 0;
                this.isPlayerInRange = false;
                this.init();
            }

            init() {
                this.texture = textureLoader.load(assetUrls.specterTexture);
                this.texture.repeat.x = 1 / totalSpecterFrames;
                const specterMaterial = new THREE.MeshStandardMaterial({ map: this.texture, color: 0x88bbff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, alphaTest: 0.1 });
                const specterGeometry = new THREE.PlaneGeometry(4.2, 4.2);
                this.mesh = new THREE.Mesh(specterGeometry, specterMaterial);
                this.mesh.position.set(this.initialX, this.floatingCenterY, camera.position.z - roomDepth + 1);
                this.mesh.frustumCulled = false; // Optimization
                this.scene.add(this.mesh);
            }

            setNewState(newState) {
                this.state = newState;
                switch(this.state) {
                    case 'IDLE':
                        this.stateTimer = Math.random() * 2 + 2;
                        break;
                    case 'MOVING':
                        const newX = Math.random() * (playableAreaWidth - 20) - (playableAreaWidth / 2 - 10);
                        this.targetPosition.set(newX, this.floatingCenterY, this.mesh.position.z);
                        this.stateTimer = 10;
                        break;
                    case 'PHASING_DOWN':
                        this.stateTimer = 1.5;
                        break;
                    case 'PHASING_UP':
                        const spawnX = Math.random() * (playableAreaWidth - 20) - (playableAreaWidth / 2 - 10);
                        this.mesh.position.set(spawnX, -5, this.mesh.position.z);
                        this.stateTimer = 1.5;
                        break;
                    case 'FLEEING':
                         this.targetPosition.x = this.mesh.position.x + (this.mesh.position.x - player.mesh.position.x > 0 ? 15 : -15);
                         this.targetPosition.x = Math.max(-playableAreaWidth/2 + 5, Math.min(playableAreaWidth/2 - 5, this.targetPosition.x));
                         this.stateTimer = 3;
                        break;
                }
            }

            update(deltaTime, player) {
                this.stateTimer -= deltaTime;

                if (Date.now() - this.lastFrameTime > specterAnimationSpeed) {
                    this.lastFrameTime = Date.now();
                    this.currentFrame = (this.currentFrame + 1) % totalSpecterFrames;
                    this.texture.offset.x = this.currentFrame / totalSpecterFrames;
                }

                switch(this.state) {
                    case 'IDLE':
                        this.mesh.position.y = this.floatingCenterY + Math.sin(Date.now() * 0.002) * 0.5;
                        if (this.stateTimer <= 0) {
                            this.setNewState(Math.random() > 0.3 ? 'MOVING' : 'PHASING_DOWN');
                        }
                        break;

                    case 'MOVING':
                    case 'FLEEING':
                        const direction = this.targetPosition.clone().sub(this.mesh.position).normalize();
                        const speed = this.state === 'FLEEING' ? this.moveSpeed * 2 : this.moveSpeed;
                        this.mesh.position.x += direction.x * speed;

                        if (direction.x > 0.01) this.mesh.scale.x = -1;
                        if (direction.x < -0.01) this.mesh.scale.x = 1;

                        if (this.mesh.position.distanceTo(this.targetPosition) < 1 || this.stateTimer <= 0) {
                            this.setNewState('IDLE');
                        }
                        break;

                    case 'PHASING_DOWN':
                        this.mesh.material.opacity = Math.max(0, 1 - (1.5 - this.stateTimer) / 1.5);
                        this.mesh.position.y -= 0.1;
                        if (this.stateTimer <= 0) {
                            this.setNewState('PHASING_UP');
                        }
                        break;

                    case 'PHASING_UP':
                        this.mesh.material.opacity = Math.min(0.8, (1.5 - this.stateTimer) / 1.5);
                        this.mesh.position.y = Math.min(this.floatingCenterY, this.mesh.position.y + 0.1);
                         if (this.stateTimer <= 0) {
                            this.mesh.material.opacity = 0.8;
                            this.mesh.position.y = this.floatingCenterY;
                            this.setNewState('IDLE');
                        }
                        break;
                }

                if (player && this.state !== 'PHASING_DOWN' && this.state !== 'PHASING_UP' && this.state !== 'FLEEING') {
                    const distanceToPlayer = player.mesh.position.distanceTo(this.mesh.position);

                    if (distanceToPlayer < 8) {
                        this.setNewState('FLEEING');
                    }

                    // Ghost voice logic for the specific ghost
                    if (this.initialX === 45) { // Check if it's the specific ghost from dungeon_1
                        if (distanceToPlayer < 10 && !this.isPlayerInRange) {
                            const randomPitch = 0.8 + Math.random() * 0.4; // Pitch between 0.8 and 1.2
                            playAudio('fantasma_lamento', false, randomPitch);
                            this.isPlayerInRange = true;
                        } else if (distanceToPlayer >= 10 && this.isPlayerInRange) {
                            this.isPlayerInRange = false;
                        }
                    }
                }
            }
        }

        class SimpleEnemy {
            constructor(scene, initialX) {
                this.scene = scene;
                this.texture = textureLoader.load(assetUrls.enemySprite);
                this.texture.repeat.x = 1 / totalEnemyFrames;

                const enemyHeight = 5.6;
                const enemyWidth = 5.6;

                const enemyMaterial = new THREE.MeshStandardMaterial({
                    map: this.texture,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide
                });
                const enemyGeometry = new THREE.PlaneGeometry(enemyWidth, enemyHeight);
                this.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
                this.mesh.position.set(initialX, enemyHeight / 2, 0); // Z=0 para alinear con el jugador
                this.mesh.castShadow = true;
                this.mesh.frustumCulled = false; // Optimization
                this.scene.add(this.mesh);

                this.hitCount = 0;
                this.isAlive = true;

                this.state = 'PATROL'; // 'PATROL' o 'PURSUE'
                this.detectionRange = 6.0;
                this.patrolSpeed = 0.03;
                this.pursueSpeed = 0.045; // 50% más rápido

                this.currentFrame = 0;
                this.lastFrameTime = 0;
                this.direction = -1; // -1 for left, 1 for right
                this.patrolRange = { min: -playableAreaWidth / 2 + 5, max: playableAreaWidth / 2 - 5 };
                this.mesh.position.x = this.patrolRange.max; // Start at the right edge

                // Audio System
                this.stepTimer = 0;
                this.impactTimer = Math.random() * 5 + 3; // Initial random delay
                this.growlSource = null;
                this.growlGain = null;
                this.startGrowl();
            }

            startGrowl() {
                if (!audioBuffers['enemy1_growl']) return;
                this.growlSource = audioContext.createBufferSource();
                this.growlSource.buffer = audioBuffers['enemy1_growl'];
                this.growlSource.loop = true;
                this.growlGain = audioContext.createGain();
                this.growlGain.gain.value = 0; // Start silent, update in loop
                this.growlSource.connect(this.growlGain).connect(audioContext.destination);
                this.growlSource.start();
            }

            stopAudio(fadeOutDuration = 0) {
                if (this.growlSource) {
                    if (fadeOutDuration > 0 && this.growlGain) {
                        try {
                            const now = audioContext.currentTime;
                            this.growlGain.gain.setValueAtTime(this.growlGain.gain.value, now);
                            this.growlGain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
                            this.growlSource.stop(now + fadeOutDuration);
                        } catch(e) {
                             this.growlSource.stop();
                        }
                    } else {
                        try { this.growlSource.stop(); } catch(e) {}
                    }
                    this.growlSource = null;
                }
            }

            playScopedSound(name, rate, baseVolume, distance) {
                if (!audioBuffers[name]) return;
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffers[name];
                source.playbackRate.value = rate;

                const gain = audioContext.createGain();
                const maxDist = 30;
                let vol = 1 - (distance / maxDist);
                if (vol < 0) vol = 0;
                gain.gain.value = baseVolume * vol * vol; // Quadratic falloff

                source.connect(gain).connect(audioContext.destination);
                source.start();
            }

            update(deltaTime) {
                if (!this.isAlive || !player) return;

                const distanceToPlayer = this.mesh.position.distanceTo(player.mesh.position);

                // Update Growl Volume (Distance Based)
                if (this.growlGain) {
                    const maxDist = 30;
                    let vol = 1 - (distanceToPlayer / maxDist);
                    if (vol < 0) vol = 0;
                    // Growl volume increased to max (1.0)
                    this.growlGain.gain.setTargetAtTime(vol * 1.0, audioContext.currentTime, 0.1);
                }

                // Audio Logic: Steps
                this.stepTimer -= deltaTime;
                if (this.stepTimer <= 0) {
                    // Play step sound, slowed down further (0.7) and less frequent
                    this.playScopedSound('enemy1_step', 0.7, 0.8, distanceToPlayer); // Increased volume slightly
                    this.stepTimer = 1.2; // ~1200ms between steps (Slower walk)
                }

                // Audio Logic: Impact (Stone Breaking)
                this.impactTimer -= deltaTime;
                if (this.impactTimer <= 0) {
                     this.playScopedSound('enemy1_impact', 1.0, 1.0, distanceToPlayer);
                     this.impactTimer = Math.random() * 6 + 4; // Every 4-10 seconds
                }

                // Lógica de cambio de estado
                if (distanceToPlayer < this.detectionRange) {
                    this.state = 'PURSUE';
                } else {
                    this.state = 'PATROL';
                }

                let currentSpeed = this.patrolSpeed;

                if (this.state === 'PURSUE') {
                    currentSpeed = this.pursueSpeed;
                    this.direction = (player.mesh.position.x > this.mesh.position.x) ? 1 : -1;
                } else { // PATROL
                    if (this.mesh.position.x <= this.patrolRange.min) {
                        this.direction = 1; // Move right
                    } else if (this.mesh.position.x >= this.patrolRange.max) {
                        this.direction = -1; // Move left
                    }
                }

                this.mesh.position.x += currentSpeed * this.direction;

                // El enemigo siempre mira al jugador
                const isFacingLeft = (player.mesh.position.x < this.mesh.position.x);
                this.mesh.rotation.y = isFacingLeft ? Math.PI : 0;

                // Animate the sprite
                if (Date.now() - this.lastFrameTime > animationSpeed) {
                    this.lastFrameTime = Date.now();
                    this.currentFrame = (this.currentFrame + 1) % totalEnemyFrames;
                    this.texture.offset.x = this.currentFrame / totalEnemyFrames;
                }
            }

            takeHit() {
                if (!this.isAlive) return;
                this.hitCount++;

                if (this.hitCount >= 6) { // Derrotado después de 6 golpes
                    this.isAlive = false;
                    this.scene.remove(this.mesh);

                    // Fade out growl on death (1.5s fade)
                    this.stopAudio(1.5);

                    // 50% de probabilidad de soltar un power-up
                    if (Math.random() < 0.5) {
                        const dropPosition = this.mesh.position.clone();
                        // 50% Salud (verde), 50% Poder (azul)
                        const type = Math.random() < 0.5 ? 'health' : 'power';
                        allPowerUps.push(new PowerUp(this.scene, dropPosition, type));
                    }

                    const index = allSimpleEnemies.indexOf(this);
                    if (index > -1) {
                        allSimpleEnemies.splice(index, 1);
                    }
                }
            }
        }

        class Puzzle {
            constructor(scene, x, roomId) {
                this.scene = scene;
                this.roomId = roomId;
                this.isSolved = completedRooms[roomId];
                this.pieces = [];
                this.init(x);
                this.mesh = this.table;
            }

            init(x) {
                const tableGeometry = new THREE.BoxGeometry(8, 2, 4);
                const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
                this.table = new THREE.Mesh(tableGeometry, tableMaterial);
                this.table.position.set(x, 1, camera.position.z - roomDepth + 4);
                this.table.frustumCulled = false; // Optimization
                this.scene.add(this.table);

                if (this.isSolved) {
                    this.createOrb();
                    this.orb.activate();
                    return;
                }

                const texture = textureLoader.load(assetUrls.wallTexture);
                const pieceSize = 3;

                const correctPositions = [
                    new THREE.Vector3(-pieceSize/2, pieceSize/2, 0),
                    new THREE.Vector3(pieceSize/2, pieceSize/2, 0),
                    new THREE.Vector3(-pieceSize/2, -pieceSize/2, 0),
                    new THREE.Vector3(pieceSize/2, -pieceSize/2, 0),
                ];

                let initialPositions = [...correctPositions].sort(() => Math.random() - 0.5);

                for (let i = 0; i < 4; i++) {
                    const material = new THREE.MeshStandardMaterial({
                        map: texture.clone(),
                        transparent: true,
                        alphaTest: 0.1
                    });
                    material.map.repeat.set(0.5, 0.5);
                    material.map.offset.set((i % 2) * 0.5, (i < 2 ? 0.5 : 0));

                    const piece = new THREE.Mesh(new THREE.PlaneGeometry(pieceSize, pieceSize), material);
                    piece.position.copy(initialPositions[i]).add(new THREE.Vector3(x, 4, this.table.position.z + 2.1));
                    piece.userData.targetPosition = correctPositions[i].clone().add(new THREE.Vector3(x, 4, this.table.position.z + 2.1));
                    piece.frustumCulled = false; // Optimization
                    this.pieces.push(piece);
                    this.scene.add(piece);
                }
            }

            solve() {
                if (this.isSolved) return;
                this.isSolved = true;

                this.pieces.forEach(piece => {
                    const startPos = piece.position.clone();
                    const endPos = piece.userData.targetPosition;
                    let t = 0;
                    const duration = 1;
                    const animatePiece = () => {
                        t += 0.05;
                        piece.position.lerpVectors(startPos, endPos, Math.min(t/duration, 1.0));
                        if (t < duration) requestAnimationFrame(animatePiece);
                    };
                    animatePiece();
                });

                setTimeout(() => {
                    this.createOrb();
                    this.orb.activate();
                }, 1200);
            }

            createOrb() {
                this.orb = new Orb(this.scene, this.mesh.position.x, this.mesh.position.y + 2.5, this.roomId);
                allOrbs.push(this.orb);
            }

            update(deltaTime) {}
        }

        class Orb {
            constructor(scene, x, y, roomId) {
                this.scene = scene;
                this.roomId = roomId;
                this.isActive = completedRooms[roomId];

                this.inactiveMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
                this.activeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2, roughness: 0.2 });

                const geometry = new THREE.SphereGeometry(0.5, 32, 32);
                this.mesh = new THREE.Mesh(geometry, this.isActive ? this.activeMaterial : this.inactiveMaterial);
                this.mesh.position.set(x, y, camera.position.z - roomDepth + 3);
                this.mesh.frustumCulled = false; // Optimization
                scene.add(this.mesh);

                this.light = new THREE.PointLight(0xffffff, 1, 10);
                this.light.position.copy(this.mesh.position);
                this.light.visible = this.isActive;
                scene.add(this.light);
            }

            activate() {
                if (this.isActive) return;
                this.isActive = true;
                this.mesh.material = this.activeMaterial;
                this.light.visible = true;
                completedRooms[this.roomId] = true;
            }
        }

        let sharedProjectileMaterial = null;

        class Projectile {
            constructor(scene, startPosition, direction) {
                this.scene = scene;
                this.lifetime = 2;
                this.speed = 0.5;

                if (!sharedProjectileMaterial) {
                    sharedProjectileMaterial = new THREE.MeshBasicMaterial({
                        map: textureLoader.load(assetUrls.flameParticle),
                        color: 0xaaddff,
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                    });
                }

                const geometry = new THREE.PlaneGeometry(1.0, 1.0);
                this.mesh = new THREE.Mesh(geometry, sharedProjectileMaterial);
                this.mesh.position.copy(startPosition);
                this.mesh.frustumCulled = false; // Optimization

                // Rotar el proyectil según la dirección para que la cola quede atrás
                // Asumiendo que el sprite original apunta hacia arriba (como una flama normal),
                // restamos 90 grados (PI/2) para que "Arriba" apunte a "Derecha" si el ángulo es 0.
                const angle = Math.atan2(direction.y, direction.x);
                // Ajustado: angle + Math.PI / 2 para invertir la dirección (180 grados extra) porque la bola salía "al revés"
                this.mesh.rotation.z = angle + Math.PI / 2;

                this.velocity = new THREE.Vector3(direction.x, direction.y, 0).multiplyScalar(this.speed);

                this.scene.add(this.mesh);
            }

            update(deltaTime) {
                this.lifetime -= deltaTime;
                if (this.lifetime <= 0) {
                    allFlames.push(new RealisticFlame(this.scene, this.mesh.position, 3));
                    return false;
                }

                // Efecto de latido (pulsing) suave: "chiquito un poquito grande"
                const pulse = 1.0 + Math.sin((2.0 - this.lifetime) * 15) * 0.2;
                this.mesh.scale.set(pulse, pulse, 1);

                this.mesh.position.x += this.velocity.x;
                this.mesh.position.y += this.velocity.y;

                // Wall collision
                if (this.mesh.position.x < player.minPlayerX || this.mesh.position.x > player.maxPlayerX) {
                    allFlames.push(new RealisticFlame(this.scene, this.mesh.position, 3));
                    playAudio('fireball_impact', false, 0.9 + Math.random() * 0.2);
                    this.lifetime = 0;
                    return false;
                }

                // Collision with simple enemies
                for (const enemy of allSimpleEnemies) {
                    if (this.mesh.position.distanceTo(enemy.mesh.position) < (enemy.mesh.geometry.parameters.height / 2)) {
                        enemy.takeHit();
                        allFlames.push(new RealisticFlame(this.scene, this.mesh.position, 3));
                        playAudio('fireball_impact', false, 0.9 + Math.random() * 0.2);
                        this.lifetime = 0; // Mark for removal
                        return false; // Projectile disappears
                    }
                }

                return true;
            }
        }

        class Statue {
            constructor(scene, x, y, z, textureUrl, dialogueKey) {
                this.scene = scene;
                this.dialogueKey = dialogueKey; // Store the key
                this.texture = textureLoader.load(textureUrl);
                const material = new THREE.MeshStandardMaterial({
                    map: this.texture,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide
                });
                const geometry = new THREE.PlaneGeometry(6, 6);
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.set(x, y, z);
                this.mesh.frustumCulled = false; // Optimization
                this.scene.add(this.mesh);
            }

            interact() {
                // Look up the translation when interacting
                showDialogue(this.dialogueKey, 4000);
            }
        }

        class PowerUp {
            constructor(scene, position, type) {
                this.scene = scene;
                this.type = type; // 'health' or 'power'

                const geometry = new THREE.PlaneGeometry(0.8, 1.2); // Flama pequeña

                if (!sharedHealthMaterial) {
                    sharedHealthMaterial = new THREE.MeshBasicMaterial({
                        map: textureLoader.load(assetUrls.flameParticle),
                        color: 0x00ff00, // Verde para salud
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        side: THREE.DoubleSide
                    });
                }

                if (!sharedPowerMaterial) {
                    sharedPowerMaterial = new THREE.MeshBasicMaterial({
                        map: textureLoader.load(assetUrls.flameParticle),
                        color: 0x00aaff, // Azul para poder
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        side: THREE.DoubleSide
                    });
                }

                const material = (this.type === 'health') ? sharedHealthMaterial : sharedPowerMaterial;

                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.copy(position);
                this.mesh.frustumCulled = false; // Optimization
                this.scene.add(this.mesh);

                this.lifetime = 10; // El power-up desaparece después de 10 segundos
                this.bobbingAngle = Math.random() * Math.PI * 2;
                this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.04, 0, 0); // Movimiento lateral lento
            }

            update(deltaTime) {
                this.lifetime -= deltaTime;
                if (this.lifetime <= 0) {
                    this.scene.remove(this.mesh);
                    const index = allPowerUps.indexOf(this);
                    if (index > -1) allPowerUps.splice(index, 1);
                    return;
                }

                // Animación simple de la flama (escalado pulsante)
                const pulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.2;
                this.mesh.scale.set(pulse, pulse, 1);

                if (player && player.isAbsorbing) {
                    const direction = player.mesh.position.clone().sub(this.mesh.position).normalize();
                    const absorptionSpeed = 0.2; // Un poco más rápido al absorber
                    this.velocity.lerp(direction.multiplyScalar(absorptionSpeed), 0.1);
                }

                this.mesh.position.add(this.velocity);

                if (!player.isAbsorbing && (this.mesh.position.x < -playableAreaWidth / 2 + 2 || this.mesh.position.x > playableAreaWidth / 2 - 2)) {
                    this.velocity.x *= -1; // Rebotar en los bordes solo si no se está absorbiendo
                }

                // Efecto de flotación
                this.bobbingAngle += 0.05;
                this.mesh.position.y += Math.sin(this.bobbingAngle) * 0.01;
                // Billboard: mirar siempre a la cámara
                this.mesh.lookAt(camera.position);

                // Comprobar colisión con el jugador
                if (player && this.mesh.position.distanceTo(player.mesh.position) < 1.5) {
                    if (this.type === 'health') {
                        player.restoreHealth(player.maxHealth * 0.10); // Restaura 10% salud
                    } else if (this.type === 'power') {
                        player.restorePower(player.maxPower * 0.15); // Restaura 15% poder
                    }

                    this.scene.remove(this.mesh);
                    const index = allPowerUps.indexOf(this);
                    if (index > -1) allPowerUps.splice(index, 1);
                }
            }
        }
