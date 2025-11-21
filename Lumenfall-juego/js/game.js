// --- src/game.js (Lógica Principal) ---

        const assetUrls = {
            runningSprite: 'assets/sprites/characters/LumenFall.png',
            attackSprite: 'assets/sprites/characters/attack_sprite_sheet.png',
            jumpSprite: 'assets/imagenes/saltando.png',
            flameParticle: 'assets/sprites/effects/fuego.png',
            wallTexture: 'assets/environment/tiles/pared-calabozo.png',
            doorTexture: 'assets/environment/objects/puerta-calabozo.png',
            floorTexture: 'assets/environment/tiles/piso-calabozo.png',
            torchTexture: 'assets/environment/objects/antorcha.png',
            specterTexture: 'assets/sprites/enemies/fantasma.png',
            introImage: 'assets/ui/Intro.jpg',
            menuBackgroundImage: 'assets/ui/menu-principal.jpg',
            animatedEnergyBar: 'assets/ui/barra-de-energia.png',
            halleyStatueTexture: 'assets/sprites/characters/Halley-piedra.png',
            enemySprite: 'assets/sprites/enemies/enemigo-1.png'
        };

        const totalRunningFrames = 8;
        const totalAttackFrames = 6;
        const totalJumpFrames = 4;
        const totalSpecterFrames = 5;
        const totalEnemyFrames = 5;
        const animationSpeed = 80;
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

        function playAudio(name, loop = false, playbackRate = 1.0) {
            if (!audioBuffers[name]) return;
            if (audioSources[name] && audioSources[name].buffer) stopAudio(name);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffers[name];
            source.loop = loop;
            source.playbackRate.value = playbackRate;
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0.5;
            source.connect(gainNode).connect(audioContext.destination);
            source.start(0);
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
        const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true, alpha: true });
        const textureLoader = new THREE.TextureLoader();
        const clock = new THREE.Clock();

        let player;
        const allFlames = [];
        const allSpecters = [];
        const allSimpleEnemies = [];
        const allGates = [];
        const allStatues = [];
        const allOrbs = [];
        const allPuzzles = [];
        const allProjectiles = [];
        const allPowerUps = [];

        let currentLevelId = 'dungeon_1';
        let isPaused = false;
        let isTransitioning = false;
        let animationFrameId;

        const completedRooms = { room_1: false, room_2: false, room_3: false, room_4: false, room_5: false };

        let isGamepadModeActive = false;
        let isVibrationEnabled = true;
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
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0);

        const ambientLight = new THREE.AmbientLight(0x808080, 1.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xaaaaaa, 0.5);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        function animate() {
            if (isPaused) return;
            animationFrameId = requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

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
                    const distanceX = Math.abs(player.mesh.position.x - gate.mesh.position.x);
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
            allSpecters.forEach(specter => specter.update(deltaTime, player));
            allSimpleEnemies.forEach(enemy => enemy.update(deltaTime));
            allPuzzles.forEach(puzzle => puzzle.update(deltaTime));
            allPowerUps.forEach(powerUp => powerUp.update(deltaTime));

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
                halleyStatueDialogue: "Esta es la estatua de Halley, la primera guardiana. Su luz guió a los perdidos.",
                shoot: "Disparar",
                attack: "Atacar",
                activateGamepad: "Activar Control",
                deactivateGamepad: "Activar Táctil",
                toggleVibrationOn: "Vibración: ON",
                toggleVibrationOff: "Vibración: OFF"
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
                halleyStatueDialogue: "This is the statue of Halley, the first guardian. Her light guided the lost.",
                shoot: "Shoot",
                attack: "Attack",
                activateGamepad: "Activate Gamepad",
                deactivateGamepad: "Activate Touch",
                toggleVibrationOn: "Vibration: ON",
                toggleVibrationOff: "Vibration: OFF"
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

            vibrationToggleButton.textContent = isVibrationEnabled
                ? lang.toggleVibrationOn
                : lang.toggleVibrationOff;

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
                    loadAudio('fantasma_lamento', 'assets/audio/voz-fantasma.mp3')
                ]);
            } catch (error) {
                console.error("Error loading audio", error);
            }
            playAudio('ambiente', true);
            setAudioVolume('ambiente', musicVolumeSlider.value);
            setAudioVolume('pasos', sfxVolumeSlider.value);

            menuScreen.style.opacity = 0;
            menuScreen.addEventListener('transitionend', () => {
                menuScreen.style.display = 'none';
                document.getElementById('bg-canvas').style.display = 'block';
                document.getElementById('ui-container').style.display = 'flex';
                controlsContainer.style.opacity = '1';
                controlsContainer.style.pointerEvents = 'auto';
                player = new Player();
                loadLevelById(currentLevelId);
                animate();
            }, { once: true });
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
            isVibrationEnabled = !isVibrationEnabled;
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
        }
        function handleAttackPressEnd() {
            if (isPaused) return;
            isAttackButtonPressed = false;
        }

        btnAttack.addEventListener('mousedown', () => !isGamepadModeActive && handleAttackPressStart());
        btnAttack.addEventListener('mouseup', () => !isGamepadModeActive && handleAttackPressEnd());
        btnAttack.addEventListener('touchstart', (e) => { if(!isGamepadModeActive) { e.preventDefault(); handleAttackPressStart(); } }, { passive: false });
        btnAttack.addEventListener('touchend', () => !isGamepadModeActive && handleAttackPressEnd());

        btnShoot.addEventListener('mousedown', () => { if(!isPaused && !isGamepadModeActive) player.shoot(joyVector); });
        btnShoot.addEventListener('touchstart', (e) => { if(!isPaused && !isGamepadModeActive) { e.preventDefault(); player.shoot(joyVector); } }, { passive: false });


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
            if (!isVibrationEnabled) return;
            const gp = navigator.getGamepads()[0];
            if (gp && gp.vibrationActuator) {
                gp.vibrationActuator.playEffect("dual-rumble", {
                    startDelay: 0,
                    duration: duration,
                    weakMagnitude: weak,
                    strongMagnitude: strong,
                });
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
                this.attackTexture = textureLoader.load(assetUrls.attackSprite);
                this.jumpTexture = textureLoader.load(assetUrls.jumpSprite);

                this.runningTexture.repeat.x = 1 / totalRunningFrames;
                this.attackTexture.repeat.x = 1 / totalAttackFrames;
                this.jumpTexture.repeat.x = 1 / totalJumpFrames;

                const playerHeight = 4.2;
                const playerWidth = 4.2;

                const playerGeometry = new THREE.PlaneGeometry(playerWidth, playerHeight);
                const playerMaterial = new THREE.MeshBasicMaterial({ map: this.runningTexture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });
                this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
                this.mesh.position.y = playerHeight / 2;
                this.mesh.castShadow = true;
                scene.add(this.mesh);

                this.playerLight = new THREE.PointLight(0xffffff, 0.5, 8);
                scene.add(this.playerLight);

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

            restorePowerAndHealth() {
                const healthRestore = this.maxHealth * 0.05;
                const powerRestore = this.maxPower * 0.05;

                this.health = Math.min(this.maxHealth, this.health + healthRestore);
                this.power = Math.min(this.maxPower, this.power + powerRestore);

                this.energyBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
                this.powerBarFill.style.width = `${(this.power / this.maxPower) * 100}%`;
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
                flameGroup.add(flameCore);
                flameGroup.visible = false;
                this.mesh.add(flameGroup);
                this.rightHandFlame = flameGroup;
                this.rightHandFlame.position.set(-0.6, 0.3, 0.3);

                const leftHandFlame = flameGroup.clone();
                this.mesh.add(leftHandFlame);
                this.leftHandFlame = leftHandFlame;
                this.leftHandFlame.position.set(0.6, 0.3, 0.3);
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
                    if (controls.attackHeld) {
                        if(this.currentState !== 'attacking') vibrateGamepad(100, 0.8, 0.8);
                        this.currentState = 'attacking';
                    } else {
                        const isJumpingInput = joyY > 0.5;
                        if (isJumpingInput && this.isGrounded && !this.jumpInputReceived) {
                            this.isJumping = true;
                            this.isGrounded = false;
                            this.velocity.y = this.jumpPower;
                            this.currentState = 'jumping';
                            this.jumpInputReceived = true;
                        } else if (!isJumpingInput) {
                            this.jumpInputReceived = false;
                        }

                        if (isMoving) {
                            this.currentState = 'running';
                        } else if (!this.isJumping) {
                            this.currentState = 'idle';
                        }
                    }
                }

                // Aplicar gravedad y velocidad vertical
                if (!this.isGrounded) this.velocity.y += this.gravity;
                this.mesh.position.y += this.velocity.y;

                // Aplicar velocidad horizontal
                this.mesh.position.x += this.velocity.x;

                if (this.mesh.position.y <= this.mesh.geometry.parameters.height / 2) {
                    this.mesh.position.y = this.mesh.geometry.parameters.height / 2;
                    this.isGrounded = true;
                    this.isJumping = false;
                    this.velocity.y = 0;
                }

                this.mesh.position.x = Math.max(this.minPlayerX, Math.min(this.maxPlayerX, this.mesh.position.x));
                this.mesh.rotation.y = this.isFacingLeft ? Math.PI : 0;

                // Camera follow logic
                camera.position.x = this.mesh.position.x;
                const targetCameraY = this.mesh.position.y + 1.9; // Maintain initial offset
                camera.position.y += (targetCameraY - camera.position.y) * 0.05; // Smoothly interpolate

                this.playerLight.position.set(this.mesh.position.x, this.mesh.position.y + 1, this.mesh.position.z + 2);

                if (this.currentState !== previousState) this.currentFrame = 0;

                const isAttacking = this.currentState === 'attacking';
                this.rightHandFlame.visible = isAttacking;
                this.leftHandFlame.visible = isAttacking;
                if (isAttacking) this.updateAttackFlames();

                if (Date.now() - this.lastFrameTime > animationSpeed) {
                    this.lastFrameTime = Date.now();
                    let totalFrames, currentTexture;
                    switch (this.currentState) {
                        case 'shooting': [totalFrames, currentTexture] = [totalAttackFrames, this.attackTexture]; this.currentFrame = 2; break;
                        case 'attacking': [totalFrames, currentTexture] = [totalAttackFrames, this.attackTexture]; if (this.currentFrame < totalFrames - 1) this.currentFrame++; break;
                        case 'running': [totalFrames, currentTexture] = [totalRunningFrames, this.runningTexture]; this.currentFrame = (this.currentFrame + 1) % totalFrames; break;
                        case 'jumping': [totalFrames, currentTexture] = [totalJumpFrames, this.jumpTexture]; this.currentFrame = this.velocity.y > 0 ? 1 : 2; break;
                        default: [totalFrames, currentTexture] = [totalAttackFrames, this.attackTexture]; this.currentFrame = 0; break;
                    }
                    if (currentTexture) {
                        this.mesh.material.map = currentTexture;
                        currentTexture.offset.x = this.currentFrame / totalFrames;
                    }
                }
            }
        }

        const wallTexture = textureLoader.load(assetUrls.wallTexture);
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, color: 0x454555 });
        const doorTexture = textureLoader.load(assetUrls.doorTexture);
        const doorMaterial = new THREE.MeshStandardMaterial({ map: doorTexture, transparent: true, alphaTest: 0.5 });
        const floorTexture = textureLoader.load(assetUrls.wallTexture);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(30, 2);
        const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
        const torchTexture = textureLoader.load(assetUrls.torchTexture);
        const torchMaterial = new THREE.MeshStandardMaterial({ map: torchTexture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
        const floorGeometry = new THREE.PlaneGeometry(playableAreaWidth, roomDepth);

        function clearSceneForLevelLoad() {
            for (let i = scene.children.length - 1; i >= 0; i--) {
                const obj = scene.children[i];
                if (obj !== player.mesh && obj !== player.playerLight && !(obj instanceof THREE.Camera) && !(obj instanceof THREE.Light)) {
                    scene.remove(obj);
                }
            }
            allFlames.length = 0;
            allSpecters.length = 0;
            allSimpleEnemies.forEach(enemy => scene.remove(enemy.mesh));
            allSimpleEnemies.length = 0;
            allGates.length = 0;
            allStatues.length = 0;
            allOrbs.length = 0;
            allPuzzles.length = 0;
            numeralsContainer.innerHTML = '';
        }

        function createTorch(x, y, z, isLit) {
            const torchMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8), torchMaterial);
            torchMesh.position.set(x, y, z);
            scene.add(torchMesh);
            if (isLit) {
                allFlames.push(new RealisticFlame(scene, new THREE.Vector3(x, y + 1.3, z + 0.2)));
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
            scene.add(floor);

            const wall = new THREE.Mesh(new THREE.PlaneGeometry(playableAreaWidth, 20), wallMaterial);
            wall.position.set(0, 10, camera.position.z - roomDepth);
            scene.add(wall);

            const sideWallGeometry = new THREE.PlaneGeometry(roomDepth, 20);
            const leftSideWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
            leftSideWall.rotation.y = Math.PI / 2;
            leftSideWall.position.set(-playableAreaWidth / 2, 10, camera.position.z - roomDepth / 2);
            scene.add(leftSideWall);
            const rightSideWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
            rightSideWall.rotation.y = -Math.PI / 2;
            rightSideWall.position.set(playableAreaWidth / 2, 10, camera.position.z - roomDepth / 2);
            scene.add(rightSideWall);

            levelData.gates.forEach(gateData => {
                if (gateData.id === 'gate_boss' && !areAllRoomsComplete()) {
                    return;
                }

                const gateGroup = new THREE.Group();
                const gateMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), doorMaterial.clone());
                gateMesh.position.set(0, 4, 0.3);
                gateGroup.add(gateMesh);
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
                specters: [],
                statues: [{
                    x: 15,
                    y: 3,
                    textureUrl: assetUrls.halleyStatueTexture,
                    dialogueKey: 'halleyStatueDialogue'
                }]
            },
            boss_room: { id: 'boss_room', name: 'Sala del Jefe', gates: [{ id: 'return_boss', x: 0, destination: 'dungeon_1', numeral: 'VI' }], specters: [] },
        };

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
                const particleMaterial = new THREE.PointsMaterial({ color: 0x00aaff, size: 0.4, map: textureLoader.load(assetUrls.flameParticle), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
                const particleGeometry = new THREE.BufferGeometry();
                const positions = new Float32Array(this.particleCount * 3);
                for (let i = 0; i < this.particleCount; i++) {
                    positions[i * 3] = this.position.x;
                    positions[i * 3 + 1] = this.position.y;
                    positions[i * 3 + 2] = this.position.z;
                    this.velocities.push({ x: (Math.random() - 0.5) * 0.02, y: Math.random() * 0.1, z: (Math.random() - 0.5) * 0.02, lifetime: Math.random() * 2 });
                }
                particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                this.particles = new THREE.Points(particleGeometry, particleMaterial);
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
            }

            update(deltaTime) {
                if (!this.isAlive || !player) return;

                const distanceToPlayer = this.mesh.position.distanceTo(player.mesh.position);

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

                    // 50% de probabilidad de soltar un power-up
                    if (Math.random() < 0.5) {
                        const dropPosition = this.mesh.position.clone();
                        allPowerUps.push(new PowerUp(this.scene, dropPosition));
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
                this.scene.add(this.table);

                if (this.isSolved) {
                    this.createOrb();
                    this.orb.activate();
                    return;
                }

                const texture = textureLoader.load(assetUrls.halleyStatueTexture);
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

        class Projectile {
            constructor(scene, startPosition, direction) {
                this.scene = scene;
                this.lifetime = 2;
                this.speed = 0.5;

                const material = new THREE.MeshBasicMaterial({
                    map: textureLoader.load(assetUrls.flameParticle),
                    color: 0xaaddff,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                });
                const geometry = new THREE.PlaneGeometry(1.0, 1.0);
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.copy(startPosition);

                this.velocity = new THREE.Vector3(direction.x, direction.y, 0).multiplyScalar(this.speed);

                this.scene.add(this.mesh);
            }

            update(deltaTime) {
                this.lifetime -= deltaTime;
                if (this.lifetime <= 0) {
                    allFlames.push(new RealisticFlame(this.scene, this.mesh.position, 3));
                    return false;
                }
                this.mesh.position.x += this.velocity.x;
                this.mesh.position.y += this.velocity.y;

                // Wall collision
                if (this.mesh.position.x < player.minPlayerX || this.mesh.position.x > player.maxPlayerX) {
                    allFlames.push(new RealisticFlame(this.scene, this.mesh.position, 3));
                    this.lifetime = 0;
                    return false;
                }

                // Collision with simple enemies
                for (const enemy of allSimpleEnemies) {
                    if (this.mesh.position.distanceTo(enemy.mesh.position) < (enemy.mesh.geometry.parameters.height / 2)) {
                        enemy.takeHit();
                        allFlames.push(new RealisticFlame(this.scene, this.mesh.position, 3));
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
                this.scene.add(this.mesh);
            }

            interact() {
                // Look up the translation when interacting
                showDialogue(this.dialogueKey, 4000);
            }
        }

        class PowerUp {
            constructor(scene, position) {
                this.scene = scene;
                const geometry = new THREE.SphereGeometry(0.4, 16, 16);
                // Material que combina azul y verde
                const material = new THREE.MeshStandardMaterial({
                    color: 0x00ff00, // Verde
                    emissive: 0x00ffff, // Azul cian brillante
                    emissiveIntensity: 2,
                    roughness: 0.2
                });
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.copy(position);
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

                if (player && player.isAbsorbing) {
                    const direction = player.mesh.position.clone().sub(this.mesh.position).normalize();
                    const absorptionSpeed = 0.1;
                    this.velocity.lerp(direction.multiplyScalar(absorptionSpeed), 0.1);
                }

                this.mesh.position.add(this.velocity);

                if (!player.isAbsorbing && (this.mesh.position.x < -playableAreaWidth / 2 + 2 || this.mesh.position.x > playableAreaWidth / 2 - 2)) {
                    this.velocity.x *= -1; // Rebotar en los bordes solo si no se está absorbiendo
                }

                // Efecto de flotación
                this.bobbingAngle += 0.05;
                this.mesh.position.y += Math.sin(this.bobbingAngle) * 0.01;

                // Comprobar colisión con el jugador
                if (player && this.mesh.position.distanceTo(player.mesh.position) < 1.5) {
                    player.restorePowerAndHealth();
                    this.scene.remove(this.mesh);
                    const index = allPowerUps.indexOf(this);
                    if (index > -1) allPowerUps.splice(index, 1);
                }
            }
        }
