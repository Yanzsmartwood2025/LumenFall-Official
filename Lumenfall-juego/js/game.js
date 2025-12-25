// --- src/game.js (Lógica Principal) ---

        const PLAYER_SCALE = 1.35;

        const assetUrls = {
            runningSprite: 'assets/sprites/Joziel/Movimiento/Correr-1.png',
            runningBackSprite: 'assets/sprites/Joziel/Movimiento-B/Movimiento-B-1.png',
            runningShadowSprite: 'assets/sprites/Joziel/Sombras-efectos/Sombra-correr_128.jpg',
            idleSprite: 'assets/sprites/Joziel/Movimiento/Joziel_Idle_V2.png',
            idleBackSprite: 'assets/sprites/Joziel/Movimiento/Joziel_Idle_V2.png',
            idleShadowSprite: 'assets/sprites/Joziel/Sombras-efectos/Idle-sombra_128.jpg',
            attackSprite: 'assets/sprites/Joziel/Movimiento/disparo-derecha-1.png',
            attackBackSprite: 'assets/sprites/Joziel/Movimiento/disparo-izquierda-1.png',
            jumpSprite: 'assets/sprites/Joziel/Movimiento/saltar.png',
            jumpBackSprite: 'assets/sprites/Joziel/Movimiento-B/saltar-b.png',
            sparkParticle: 'assets/textures/vfx/chispa.jpg',
            wallTexture: 'assets/sprites/Ambiente/pared-calabozo.png',
            doorTexture: 'assets/sprites/Ambiente/puerta-calabozo.png',
            floorTexture: 'assets/sprites/Ambiente/piso-calabozo.png',
            torchTexture: 'assets/sprites/Ambiente/antorcha.png',
            specterTexture: 'assets/sprites/Enemigos/fantasma.png', // Mantenido para DecorGhost
            introImage: 'assets/ui/Intro.jpg',
            menuBackgroundImage: 'assets/ui/menu-principal.jpg',
            animatedEnergyBar: 'assets/ui/barra-de-energia.png',
            enemySprite: 'assets/sprites/Enemigos/enemigo-1.png?v=2',
            enemyX1Run: 'assets/sprites/Enemigos/Ataques-enemigo1/correr-1.png',
            enemyX1Attack: 'assets/sprites/Enemigos/Ataques-enemigo1/ataque-1.png',
            enemyX1Death: 'assets/sprites/Enemigos/Ataques-enemigo1/muerte-1.png',
            dustParticle: 'assets/textures/vfx/Polvo.png',
            projectileSprite: 'assets/sprites/Joziel/Sombras-efectos/efectos/proyectil-1.jpg',
            chargingSprite: 'assets/sprites/Joziel/Movimiento/carga-de-energia-1.png',
            blueFire: 'assets/textures/vfx/fuego-antorcha.jpg'
        };

        const PIXELS_PER_UNIT = 64;

        // --- NEW FOLDER-BASED SCALING LOGIC ---
        function getScaleFromPath(path) {
            if (!path) return PLAYER_SCALE;
            if (path.includes('/ui/')) return 1.0; // UI must not be scaled
            if (path.includes('/Joziel/')) return PLAYER_SCALE; // x1.0
            if (path.includes('/Enemigos/Comunes/')) return PLAYER_SCALE; // x1.0
            if (path.includes('/Enemigos/Elites/')) return PLAYER_SCALE * 2.0;
            if (path.includes('/Enemigos/Jefes/')) return PLAYER_SCALE * 3.5;
            if (path.includes('/Items/')) return PLAYER_SCALE * 0.6;
            // Default for any other path (e.g., initial or uncategorized enemies)
            return PLAYER_SCALE;
        }

        function updateSizeFromAspectRatio(mesh, targetHeight) {
            if (!mesh || !mesh.material || !mesh.material.map || !mesh.material.map.image) {
                // Si no hay textura cargada aún, aplicar altura por defecto
                if (mesh) mesh.scale.y = targetHeight;
                return;
            }

            const texture = mesh.material.map;
            if (texture.image.width === 0 || texture.image.height === 0) return;

            // Calcular dimensiones efectivas del FRAME (no de la hoja completa)
            // repeat.x = 1/cols, repeat.y = 1/rows
            const frameWidth = texture.image.width * Math.abs(texture.repeat.x);
            const frameHeight = texture.image.height * Math.abs(texture.repeat.y);

            if (frameHeight === 0) return;

            const ratio = frameWidth / frameHeight;

            mesh.scale.y = targetHeight;
            mesh.scale.x = targetHeight * ratio;
            mesh.scale.z = 1;
        }

        function calculateFrameSize(texture, cols, rows) {
            if (!texture.image) return { width: 1, height: 1 };
            const frameWidth = texture.image.width / cols;
            const frameHeight = texture.image.height / rows;
            return {
                width: frameWidth / PIXELS_PER_UNIT,
                height: frameHeight / PIXELS_PER_UNIT
            };
        }

        const totalRunningFrames = 9;
        const totalIdleFrames = 5;
        const totalIdleBackFrames = 6;
        const totalAttackFrames = 6;
        const totalAttackBackFrames = 6;
        const totalJumpFrames = 7;
        const totalSpecterFrames = 5; // Usado por DecorGhost
        const totalEnemyFrames = 10;
        const totalEnemyX1Frames = 10;
        const animationSpeed = 80;
        const idleAnimationSpeed = 150;
        const specterAnimationSpeed = 120;
        const moveSpeed = 0.2;
        const playableAreaWidth = 120;
        const roomDepth = 19;

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

        // Función auxiliar para atenuación logarítmica
        function calculateLogVolume(distance, maxDistance) {
            // Curva logarítmica: volumen 1.0 a distancia 0, volumen 0.0 a distancia maxDistance
            const vol = 1.0 - (Math.log(Math.max(1, distance + 1)) / Math.log(maxDistance + 1));
            return Math.max(0, Math.min(1.0, vol));
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true, alpha: true });
        const textureLoader = new THREE.TextureLoader();
        const clock = new THREE.Clock();

        let player;
        const allFlames = [];
        const allFootstepParticles = [];
        const allSimpleEnemies = [];
        const allEnemiesX1 = [];
        const allDecorGhosts = [];
        const allGates = [];
        const allStatues = [];
        const allOrbs = [];
        const allPuzzles = [];
        const allProjectiles = [];
        const allPowerUps = [];
        let dustSystem;

        // Expose for debugging/verification
        window.allProjectiles = allProjectiles;
        window.allFlames = allFlames;
        window.allEnemiesX1 = allEnemiesX1;
        window.allSimpleEnemies = allSimpleEnemies;
        window.allGates = allGates;
        // window.completedRooms assignment moved below definition to avoid ReferenceError
        window.isCinematic = false;

        let currentLevelId = 'dungeon_1';
        let isPaused = false;
        let isTransitioning = false;
        let animationFrameId;

        let lightningLight;
        let stormTimerStrike = Math.random() * 20 + 20; // 20-40s initial
        let stormTimerDistant = Math.random() * 7 + 8; // 8-15s initial
        let isLightningActive = false;

        let firstFlameTriggered = false; // Evento La Primera Llama
        const completedRooms = { room_1: false, room_2: false, room_3: false, room_4: false, room_5: false };
        window.completedRooms = completedRooms; // Expose global AFTER definition

        window.firstKillHappened = false; // TESTEO RÁPIDO: Flag para el primer loot garantizado

        let isGamepadModeActive = false;
        let vibrationLevel = 1; // 0: Off, 1: Soft, 2: Strong
        let isAttackButtonPressed = false;
        let isGameStarting = false;
        let attackPressStartTime = 0;
        let interactPressed = false;
        let joyVector = new THREE.Vector2(0, 0);
        let prevGamepadButtons = {};

        // --- INTERACTION STATE ---
        let interactableObject = null;
        let isNearInteractable = false;
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        function attemptInteraction() {
            if (!isNearInteractable || !interactableObject) return;

            if (interactableObject.type === 'gate') {
                const gate = interactableObject.object;

                // Lógica de "Puerta Bloqueada" explícita al interactuar
                let isLocked = true;
                if (currentLevelId === 'dungeon_1') {
                    if (gate.id === 'gate_1' && firstFlameTriggered) isLocked = false;
                    else if (gate.id === 'gate_2' && completedRooms.room_1) isLocked = false;
                    else if (gate.id === 'gate_3' && completedRooms.room_2) isLocked = false;
                    else if (gate.id === 'gate_4' && completedRooms.room_3) isLocked = false;
                    else if (gate.id === 'gate_5' && completedRooms.room_4) isLocked = false;
                    else if (gate.id === 'gate_boss' && completedRooms.room_5) isLocked = false;
                } else {
                    if (completedRooms[currentLevelId]) isLocked = false;
                }

                if (isLocked) {
                    showDialogue("PUERTA BLOQUEADA", 1000);
                    playAudio('fantasma_lamento', false, 1.5); // Feedback sonoro negativo opcional
                    return;
                }

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

        // --- 3D INTERACTION PROMPT ---
        let interactPromptMesh;

        function createInteractionPrompt() {
            // Use blue fire texture
            const texture = textureLoader.load(assetUrls.blueFire);
            texture.repeat.set(1/8, 0.5);

            const mat = new THREE.MeshBasicMaterial({
                map: texture,
                color: 0x00aaff,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false, // Transparent but in world space
                side: THREE.DoubleSide
            });

            // Plane Geometry
            const geometry = new THREE.PlaneGeometry(1.5, 1.5);
            interactPromptMesh = new THREE.Mesh(geometry, mat);
            interactPromptMesh.visible = false;
            scene.add(interactPromptMesh);

            // Add simple animation logic in update loop
            interactPromptMesh.userData = { frameTimer: 0, currentFrame: 0 };
        }

        function createRomanNumeralTexture(text, isLit) {
            const canvas = document.createElement('canvas');
            canvas.width = 128; // Power of 2
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Clear
            ctx.clearRect(0, 0, 128, 128);

            // Font Style matching CSS 'Cinzel'
            ctx.font = 'bold 64px "Cinzel", serif'; // Large enough for texture
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glow/Shadow Effect
            if (isLit) {
                ctx.shadowColor = '#00aaff';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#555555';
            }

            // Draw Text
            ctx.fillText(text, 64, 64);

            // Stronger Glow Pass if lit
            if (isLit) {
                 ctx.shadowBlur = 10;
                 ctx.fillText(text, 64, 64);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            return texture;
        }

        camera.position.set(0, 6, 14);
        camera.lookAt(0, 3, 0);
        camera.far = roomDepth + 50;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x000000, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.fog = null;
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xaaaaaa, 0.5);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        lightningLight = new THREE.DirectionalLight(0xaaddff, 0);
        lightningLight.position.set(0, 20, 10);
        lightningLight.castShadow = true;
        scene.add(lightningLight);

        let lightningPointLight;

        class LightningBolt {
            constructor(scene, startPos, endPos) {
                this.scene = scene;
                this.lifetime = 0.5; // Duración total del flash
                this.timer = 0;

                // Generar geometría zig-zag 3D
                const points = [];
                const segments = 12;
                const totalDist = startPos.distanceTo(endPos);
                const step = totalDist / segments;
                const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();

                points.push(startPos.clone());

                let currentPos = startPos.clone();
                for(let i=1; i<segments; i++) {
                    currentPos.add(direction.clone().multiplyScalar(step));
                    // Añadir desplazamiento aleatorio en X/Z para el zig-zag
                    const offset = 0.8; // Amplitud del zig-zag
                    currentPos.x += (Math.random() - 0.5) * offset;
                    currentPos.z += (Math.random() - 0.5) * offset;
                    points.push(currentPos.clone());
                }
                points.push(endPos.clone());

                // Crear Mesh usando TubeGeometry para dar volumen 3D
                const path = new THREE.CatmullRomCurve3(points);
                const geometry = new THREE.TubeGeometry(path, segments, 0.15, 4, false); // Radio 0.15

                // Material: Blanco núcleo brillante con borde Cian
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff, // Blanco puro
                    side: THREE.DoubleSide
                });

                this.mesh = new THREE.Mesh(geometry, material);

                // Añadir un "glow" mesh exterior ligeramente más grande y cian
                const glowGeo = new THREE.TubeGeometry(path, segments, 0.3, 4, false);
                const glowMat = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.5,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
                this.mesh.add(this.glowMesh);

                this.scene.add(this.mesh);
            }

            update(deltaTime) {
                this.timer += deltaTime;
                if (this.timer >= this.lifetime) {
                    this.scene.remove(this.mesh);
                    return false; // Murió
                }

                // Efecto de parpadeo frenético
                const flicker = Math.random() > 0.5 ? 1.0 : 0.0;
                this.mesh.visible = flicker > 0;

                // Desvanecer al final
                if (this.timer > 0.3) {
                        this.mesh.scale.multiplyScalar(0.8);
                }

                return true;
            }
        }

        function triggerLightningStrike() {
            // Lógica de seguimiento al jugador: Caer cerca (izq o der)
            let strikeX = 0;
            if (player && player.mesh) {
                // Offset aleatorio entre 5 y 15 unidades, positivo o negativo
                const offset = (Math.random() * 10 + 5) * (Math.random() > 0.5 ? 1 : -1);
                strikeX = player.mesh.position.x + offset;

                // Mantener dentro de los límites jugables visuales
                strikeX = Math.max(-60, Math.min(60, strikeX));
            } else {
                strikeX = (Math.random() - 0.5) * 60;
            }

            // Configurar posición del rayo
            const startPos = new THREE.Vector3(strikeX, 25, -5); // Empezar alto y un poco al fondo
            const endPos = new THREE.Vector3(strikeX, 0, 2);   // Caer al piso, cerca del plano Z del jugador (Z=0 aprox)

            // Instanciar el Rayo Visual 3D
                const bolt = new LightningBolt(scene, startPos, endPos);
                // Asegurar que el rayo no desaparezca prematuramente si el bounding sphere no es perfecto, pero intentamos culling
                bolt.mesh.frustumCulled = false; // Mantener false para el rayo dinámico para evitar parpadeos
                allFlames.push(bolt);

            // Posicionar la Luz Global (Directional) para el flash general
            lightningLight.position.x = strikeX;

            // Crear/Mover Luz Puntual para Sombras Dramáticas
            if (!lightningPointLight) {
                lightningPointLight = new THREE.PointLight(0xffffff, 0, 50); // Luz Blanca, rango 50
                lightningPointLight.castShadow = true;
                lightningPointLight.shadow.bias = -0.0001;
                lightningPointLight.shadow.mapSize.width = 1024;
                lightningPointLight.shadow.mapSize.height = 1024;
                scene.add(lightningPointLight);
            }

            // Posicionar la luz puntual justo encima del impacto para proyectar sombras alargadas
            lightningPointLight.position.copy(endPos);
            lightningPointLight.position.y += 2.0; // Un poco elevado del piso

            // Evento Impacto: Flash intenso + Audio fuerte
            // Light: 0 -> 20.0 (Más intenso)
            lightningLight.intensity = 5.0; // Flash ambiente cian
            lightningPointLight.intensity = 20.0; // Flash local blanco (sombras duras)

            isLightningActive = true;
            if (dustSystem) dustSystem.setLightningState(10.0); // Boost particles

            playAudio('thunder_strike', false, 1.0, 1.0); // Play full volume

            // Flicker sequence: Flash -> Dim -> Flash -> Off
            const flickerTimeline = [
                { t: 50,  iDir: 1.0, iPoint: 5.0 },
                { t: 100, iDir: 4.0, iPoint: 15.0 },
                { t: 200, iDir: 0.5, iPoint: 2.0 },
                { t: 250, iDir: 3.0, iPoint: 10.0 },
                { t: 400, iDir: 0.0, iPoint: 0.0 }
            ];

            flickerTimeline.forEach(step => {
                setTimeout(() => {
                    lightningLight.intensity = step.iDir;
                    lightningPointLight.intensity = step.iPoint;

                    if (step.t === 400) {
                        isLightningActive = false;
                        if (dustSystem) dustSystem.setLightningState(0);
                    }
                }, step.t);
            });
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

        // --- CINEMATIC SYSTEM ---
        function triggerCinematicSequence(targetPos, onShowAction) {
            if (window.isCinematic) return;
            window.isCinematic = true;
            isPaused = true;

            const overlay = document.getElementById('agony-overlay');
            overlay.style.display = 'block';
            overlay.style.backgroundColor = 'black';
            overlay.style.opacity = 0;
            overlay.style.transition = 'opacity 0.5s ease-in-out';

            // Sequence: FadeOut -> Move/Action -> FadeIn -> Hold -> FadeOut -> Return -> FadeIn

            // 1. Fade Out
            setTimeout(() => overlay.style.opacity = 1, 10);

            setTimeout(() => {
                // 2. Hidden Phase
                const savedCamPos = camera.position.clone();
                camera.position.set(targetPos.x, targetPos.y, 14);

                if (onShowAction) onShowAction();

                // 3. Fade In (Reveal)
                overlay.style.opacity = 0;

                setTimeout(() => {
                    // 4. Hold Phase (Observation)

                    // 5. Fade Out
                    overlay.style.opacity = 1;

                    setTimeout(() => {
                        // 6. Return Camera
                        if (player) {
                             camera.position.x = player.mesh.position.x;
                             const targetCameraY = player.mesh.position.y + 6;
                             camera.position.y = targetCameraY;
                             camera.position.z = 14;
                        } else {
                             camera.position.copy(savedCamPos);
                        }

                        // 7. Fade In (Resume)
                        overlay.style.opacity = 0;
                        setTimeout(() => {
                            overlay.style.display = 'none';
                            window.isCinematic = false;
                            isPaused = false;
                            animate();
                        }, 500);

                    }, 500 + 1500); // Wait FadeIn(500) + Hold(1500)

                }, 500); // Wait FadeOut(500)

            }, 500); // Wait initial FadeOut
        }

        // --- FIRST FLAME EVENT (INTRO) ---
        function triggerFirstFlameEvent() {
            if (firstFlameTriggered) return;
            firstFlameTriggered = true;

            // Hide interact prompt to prevent visual dragging
            if (interactPromptMesh) interactPromptMesh.visible = false;

            // 1. Disable Input
            isPaused = true;
            window.isCinematic = true;

            // 2. Camera Pan to Gate #1 (x: -50)
            const startCamPos = camera.position.clone();
            const targetCamPos = new THREE.Vector3(-50, 4, startCamPos.z - 5); // Zoom in slightly?

            const durationPan = 1500; // 1.5s
            const durationHold = 3000; // 3s
            const durationReturn = 1500; // 1.5s

            const startTime = Date.now();
            let torchesIgnited = false;

            function animateEvent() {
                const now = Date.now();
                const elapsed = now - startTime;

                if (elapsed < durationPan) {
                    // Pan Phase
                    const t = elapsed / durationPan;
                    const smoothT = t * t * (3 - 2 * t); // EaseInOut
                    camera.position.lerpVectors(startCamPos, targetCamPos, smoothT);
                    requestAnimationFrame(animateEvent);
                } else if (elapsed < durationPan + durationHold) {
                    // Hold Phase
                    camera.position.copy(targetCamPos);

                    if (!torchesIgnited) {
                        torchesIgnited = true;

                        // Spawn Fire Logic (Gate 1)
                        const z = startCamPos.z - roomDepth + 0.5;

                        // Fwoosh sound
                        playAudio('fireball_cast', false, 0.5);

                        // Spawn Fire Left
                        new AmbientTorchFlame(scene, new THREE.Vector3(-56, 3.2+1.8, z+0.1));
                        const l1 = new THREE.PointLight(0x00aaff, 1, 15);
                        l1.position.set(-56, 3.2, z+0.5);
                        scene.add(l1);

                        // Spawn Fire Right
                        new AmbientTorchFlame(scene, new THREE.Vector3(-44, 3.2+1.8, z+0.1));
                        const l2 = new THREE.PointLight(0x00aaff, 1, 15);
                        l2.position.set(-44, 3.2, z+0.5);
                        scene.add(l2);
                    }
                    requestAnimationFrame(animateEvent);
                } else if (elapsed < durationPan + durationHold + durationReturn) {
                    // Return Phase
                    const panBackStart = durationPan + durationHold;
                    const t = (elapsed - panBackStart) / durationReturn;
                    const smoothT = t * t * (3 - 2 * t);

                    const pPos = player.mesh.position.clone();
                    pPos.y += 6; // Camera offset
                    pPos.z = 14; // Default Z

                    camera.position.lerpVectors(targetCamPos, pPos, smoothT);
                    requestAnimationFrame(animateEvent);
                } else {
                    // Finish
                    window.isCinematic = false;
                    isPaused = false; // Resume game loop
                    if (player) {
                        // Ensure camera is perfectly centered on player
                        camera.position.x = player.mesh.position.x;
                        const targetCameraY = player.mesh.position.y + 6;
                        camera.position.y = targetCameraY;
                        camera.position.z = 14;
                    }
                    animate(); // Ensure loop continues
                }
            }
            animateEvent();
        }

        function animate() {
            if (isPaused && !window.isCinematic) return; // Allow cinematic to run
            animationFrameId = requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            // Cinematic Mode: Skip updates, only render
            if (window.isCinematic) {
                // Update specific cinematic elements if needed?
                // For now, just render scene.
                // The animateEvent loop handles camera.
                // But we still want flames to flicker?
                for (let i = allFlames.length - 1; i >= 0; i--) {
                    if (!allFlames[i].update(deltaTime)) {
                        allFlames.splice(i, 1);
                    }
                }
                renderer.render(scene, camera);
                return;
            }

            if (!isPaused) {
                // Storm Logic
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

                // --- LOGIC: Check Room Clear & Cinematic ---
                if (currentLevelId !== 'dungeon_1' && currentLevelId !== 'boss_room') {
                    const enemiesRemaining = allSimpleEnemies.length + allEnemiesX1.length;
                    if (enemiesRemaining === 0) {
                        if (!completedRooms[currentLevelId]) {
                             completedRooms[currentLevelId] = true; // Mark Complete

                             // Trigger Cinematic Sequence
                             const exitX = 0; // Standard Exit X
                             const exitY = 4; // Door Center Y
                             const targetPos = new THREE.Vector3(exitX, exitY, 0);

                             triggerCinematicSequence(targetPos, () => {
                                 // Action: Light Torches
                                 const gateZ = -5; // Visual depth approximation for room exits

                                 new AmbientTorchFlame(scene, new THREE.Vector3(-6, 3.2+1.8, gateZ+0.1));
                                 const l1 = new THREE.PointLight(0x00aaff, 1, 15);
                                 l1.position.set(-6, 3.2, gateZ+0.5);
                                 scene.add(l1);

                                 new AmbientTorchFlame(scene, new THREE.Vector3(6, 3.2+1.8, gateZ+0.1));
                                 const l2 = new THREE.PointLight(0x00aaff, 1, 15);
                                 l2.position.set(6, 3.2, gateZ+0.5);
                                 scene.add(l2);

                                 playAudio('puerta'); // Success sound
                                 showDialogue('PUERTA DESBLOQUEADA', 2000);
                             });
                        }
                    }
                }

                // Collision detection between player and enemies
                allSimpleEnemies.forEach(enemy => {
                    if (!player.isInvincible && player.mesh.position.distanceTo(enemy.mesh.position) < 2) {
                        player.takeDamage(player.maxHealth * 0.05, enemy);
                    }
                });

                allEnemiesX1.forEach(enemy => {
                    if (!player.isInvincible && player.mesh.position.distanceTo(enemy.mesh.position) < 2.5) {
                        player.takeDamage(player.maxHealth * 0.10, enemy);
                    }

                    // Trigger First Flame Event on specific enemy death (Gatekeeper)
                    if (!enemy.isAlive && !firstFlameTriggered && enemy.isGatekeeper) {
                        triggerFirstFlameEvent();
                    }
                });

                // Reset per frame before checks
                isNearInteractable = false;
                interactableObject = null;

                allGates.forEach(gate => {
                    const distance = player.mesh.position.distanceTo(gate.mesh.position);
                    const distanceX = Math.abs(player.mesh.position.x - gate.mesh.position.x);

                    // Atmospheric Dimming ONLY - Glow removed by Director order
                    const gateMesh = gate.mesh.children[0];
                    if (distance < 10) {
                        gateMesh.material.color.setHex(0xffffff);
                    } else {
                        const dimFactor = Math.max(0.2, 1 - (distance / 40));
                        gateMesh.material.color.setScalar(dimFactor);
                    }

                    if (distanceX < 4) {
                        isNearInteractable = true;
                        interactableObject = {type: 'gate', object: gate};
                    }
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
                    // Update 3D Prompt Mesh
                    if (interactPromptMesh) {
                        let showPrompt = true;

                        // AJUSTE: La Flama SOLO debe aparecer si la puerta está DESBLOQUEADA.
                        if (interactableObject.type === 'gate') {
                            const gate = interactableObject.object;
                            let isGateUnlocked = false;

                            if (currentLevelId === 'dungeon_1') {
                                // Chain Logic
                                if (gate.id === 'gate_1' && firstFlameTriggered) isGateUnlocked = true;
                                else if (gate.id === 'gate_2' && completedRooms.room_1) isGateUnlocked = true;
                                else if (gate.id === 'gate_3' && completedRooms.room_2) isGateUnlocked = true;
                                else if (gate.id === 'gate_4' && completedRooms.room_3) isGateUnlocked = true;
                                else if (gate.id === 'gate_5' && completedRooms.room_4) isGateUnlocked = true;
                                else if (gate.id === 'gate_boss' && completedRooms.room_5) isGateUnlocked = true;
                            } else {
                                // Inside Room: Exit Unlocks when Room is Cleared
                                if (completedRooms[currentLevelId]) isGateUnlocked = true;
                            }

                            if (!isGateUnlocked) showPrompt = false;
                        }

                        interactPromptMesh.visible = showPrompt;

                        if (showPrompt) {
                            const targetPos = interactableObject.object.mesh.position.clone();
                            // Adjust offset based on type
                            const yOffset = (interactableObject.type === 'gate' ? 6.5 : 5.5);
                            interactPromptMesh.position.set(targetPos.x, targetPos.y + yOffset, targetPos.z + 2.0); // Z pushed forward

                            // Animate Prompt Texture (Flame)
                            if (interactPromptMesh.userData) {
                                 interactPromptMesh.userData.frameTimer += deltaTime;
                                 if (interactPromptMesh.userData.frameTimer > 0.05) {
                                      interactPromptMesh.userData.frameTimer = 0;
                                      interactPromptMesh.userData.currentFrame = (interactPromptMesh.userData.currentFrame + 1) % 16;
                                      const col = interactPromptMesh.userData.currentFrame % 8;
                                      const row = Math.floor(interactPromptMesh.userData.currentFrame / 8);
                                      if (interactPromptMesh.material.map) {
                                          interactPromptMesh.material.map.offset.x = col / 8;
                                          interactPromptMesh.material.map.offset.y = (1 - row) * 0.5;
                                      }
                                 }
                            }
                        }
                    }

                    if (interactPressed) {
                        attemptInteraction();
                    }
                } else {
                    if (interactPromptMesh) interactPromptMesh.visible = false;
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
            allSimpleEnemies.forEach(enemy => enemy.update(deltaTime));
            allEnemiesX1.forEach(enemy => enemy.update(deltaTime));
            allDecorGhosts.forEach(ghost => ghost.update(deltaTime));
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

        // ... (UI Elements - Kept as is)
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
        const dialogueBox = document.getElementById('dialogue-box');
        const gamepadStatus = document.getElementById('gamepad-status');
        const gamepadToggleButton = document.getElementById('gamepad-toggle');
        const vibrationToggleButton = document.getElementById('vibration-toggle');
        const controlsContainer = document.getElementById('controls');
        const gameOverScreen = document.getElementById('game-over-screen');
        const continueButton = document.getElementById('continue-button');
        const quitButton = document.getElementById('quit-button');
        const agonyOverlay = document.getElementById('agony-overlay');
        const deathVideoContainer = document.getElementById('death-video-container');
        const playerProfileImage = document.getElementById('player-profile-image');
        const energyBarContainer = document.getElementById('energy-bar');

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
                vibrationSoft: "Vibration: SUAVE",
                vibrationStrong: "Vibration: FUERTE",
                "PUERTA BLOQUEADA": "PUERTA BLOQUEADA",
                "PUERTA DESBLOQUEADA": "PUERTA DESBLOQUEADA"
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
                vibrationStrong: "Vibration: STRONG",
                "PUERTA BLOQUEADA": "DOOR LOCKED",
                "PUERTA DESBLOQUEADA": "DOOR UNLOCKED"
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
            if (isGameStarting) return;
            isGameStarting = true;

            // UX Immediate Feedback
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }

            playButton.textContent = translations[currentLanguage].loading;
            playButton.style.opacity = '0.5';
            playButton.style.pointerEvents = 'none';

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
                if (menuScreen) menuScreen.style.display = 'none';
                const bgCanvas = document.getElementById('bg-canvas');
                if (bgCanvas) bgCanvas.style.display = 'block';

                const uiContainer = document.getElementById('ui-container');
                if (uiContainer) uiContainer.style.display = 'flex';

                if (controlsContainer) {
                    controlsContainer.style.opacity = '1';
                    controlsContainer.style.pointerEvents = 'auto';
                }

                // Initialize Global Interaction Prompt Here
                createInteractionPrompt();

                player = new Player();
                window.player = player; // Expose for verification
                loadLevelById(currentLevelId);
                animate();
            };
            menuScreen.addEventListener('transitionend', onTransitionEnd, { once: true });
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

        if (languageSelect) languageSelect.addEventListener('change', handleLanguageChange);
        if (pauseLanguageSelect) pauseLanguageSelect.addEventListener('change', handleLanguageChange);

        if (playButton) {
            playButton.addEventListener('click', (e) => {
                // Ensure audio context is resumed inside user interaction
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                startGame();
            });
            playButton.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent double firing
                // Ensure audio context is resumed inside user interaction
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                startGame();
            }, { passive: false });
        }
        if (jozielHalo) jozielHalo.addEventListener('click', pauseGame);
        if (resumeButton) resumeButton.addEventListener('click', resumeGame);
        if (gamepadToggleButton) gamepadToggleButton.addEventListener('click', toggleGamepadMode);
        if (vibrationToggleButton) vibrationToggleButton.addEventListener('click', toggleVibration);
        if (musicVolumeSlider) musicVolumeSlider.addEventListener('input', (e) => setAudioVolume('ambiente', e.target.value));
        if (sfxVolumeSlider) sfxVolumeSlider.addEventListener('input', (e) => setAudioVolume('pasos', e.target.value));

        if (continueButton) continueButton.addEventListener('click', restartLevel);

        if (quitButton) quitButton.addEventListener('click', () => {
            location.reload();
        });

        if (musicToggleButton) musicToggleButton.addEventListener('click', () => {
            if (audioSources['ambiente']) {
                stopAudio('ambiente');
                musicToggleButton.textContent = '▶';
            } else {
                playAudio('ambiente', true);
                musicToggleButton.textContent = '❚❚';
            }
        });
        if (sfxToggleButton) sfxToggleButton.addEventListener('click', () => {
            if (audioSources['pasos']) {
                stopAudio('pasos');
                sfxToggleButton.textContent = '▶';
            } else {
                playAudio('pasos', true);
                sfxToggleButton.textContent = '❚❚';
            }
        });

        // ... (Joystick logic - Kept as is)
        const joystickContainer = document.getElementById('joystick-container');
        const joystickKnob = document.getElementById('joystick-knob');
        let isDraggingJoystick = false;
        let joystickTouchId = null;
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

        if (joystickContainer) {
            joystickContainer.addEventListener('mousedown', (e) => {
                if (!isPaused && !isGamepadModeActive) {
                    isDraggingJoystick = true;
                    joystickKnob.style.transition = 'none';
                    updateJoystickDimensions();
                    moveJoystick(e.clientX, e.clientY);
                }
            });
        }

        document.addEventListener('mousemove', (e) => {
            if (isDraggingJoystick && joystickTouchId === null && !isGamepadModeActive) {
                moveJoystick(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingJoystick && joystickTouchId === null && !isGamepadModeActive) {
                isDraggingJoystick = false;
                resetJoystick();
            }
        });

        if (joystickContainer) {
            joystickContainer.addEventListener('touchstart', (e) => {
                if (!isPaused && !isGamepadModeActive && joystickTouchId === null) {
                    e.preventDefault();
                    const touch = e.changedTouches[0];
                    joystickTouchId = touch.identifier;
                    isDraggingJoystick = true;
                    joystickKnob.style.transition = 'none';
                    updateJoystickDimensions();
                    moveJoystick(touch.clientX, touch.clientY);
                }
            }, { passive: false });
        }

        document.addEventListener('touchmove', (e) => {
            if (isDraggingJoystick && joystickTouchId !== null && !isGamepadModeActive) {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === joystickTouchId) {
                        moveJoystick(touch.clientX, touch.clientY);
                        break;
                    }
                }
            }
        });

        document.addEventListener('touchend', (e) => {
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

        document.addEventListener('touchcancel', (e) => {
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
            if (btnAttack) {
                btnAttack.classList.add('button-active-aura');
                btnAttack.classList.add('pressed');
            }
            triggerMobileVibration(200);
        }
        function handleAttackPressEnd() {
            if (isPaused) return;
            isAttackButtonPressed = false;
            if (btnAttack) {
                btnAttack.classList.remove('button-active-aura');
                btnAttack.classList.remove('pressed');
            }
        }

        if (btnAttack) {
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
        }

        if (btnShoot) {
            btnShoot.addEventListener('mousedown', () => {
                if(!isPaused && !isGamepadModeActive) {
                    player.shoot(joyVector);
                    btnShoot.classList.add('button-active-aura');
                    btnShoot.classList.add('pressed');
                    triggerMobileVibration(50);
                    setTimeout(() => {
                        if (btnShoot) {
                            btnShoot.classList.remove('button-active-aura');
                            btnShoot.classList.remove('pressed');
                        }
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
                        if (btnShoot) {
                            btnShoot.classList.remove('button-active-aura');
                            btnShoot.classList.remove('pressed');
                        }
                    }, 200);
                }
            }, { passive: false });
        }


        if (startButton) {
            startButton.addEventListener('click', () => {
                // FORCE FULLSCREEN ON START
                try {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log("Fullscreen blocked or not supported:", err);
                    });
                } catch (e) { console.log(e); }

                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                (async () => {
                    try {
                        if (screen.orientation && typeof screen.orientation.lock === 'function') {
                            await screen.orientation.lock('landscape');
                        }
                    } catch (err) {
                        console.error('Could not lock orientation:', err);
                    }
                })();

                if (startButtonContainer) startButtonContainer.style.display = 'none';
                if (introImage) introImage.src = assetUrls.introImage;
                if (introScreen) {
                    introScreen.style.opacity = 0;
                    introScreen.style.pointerEvents = 'none'; // Prevent blocking

                    const onIntroTransitionEnd = () => {
                        introScreen.style.display = 'none';
                        if (menuScreen) {
                            menuScreen.style.backgroundImage = `url('${assetUrls.menuBackgroundImage}')`;
                            menuScreen.style.display = 'flex';
                            setTimeout(() => menuScreen.style.opacity = 1, 10);
                        }
                    };

                    introScreen.addEventListener('transitionend', onIntroTransitionEnd, { once: true });

                    // Fallback in case transitionend fails
                    setTimeout(() => {
                        if (introScreen.style.display !== 'none') {
                            introScreen.removeEventListener('transitionend', onIntroTransitionEnd);
                            onIntroTransitionEnd();
                        }
                    }, 1100);
                }
            });
        }

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

        // --- NEW INPUT HANDLERS FOR INTERACTION ---
        window.addEventListener('keydown', (e) => {
            if (!isPaused && (e.key.toLowerCase() === 'e' || e.key === 'Enter')) {
                attemptInteraction();
            }
        });

        function onPointerDown(event) {
            if (isPaused) return;

            // Calculate pointer position in normalized device coordinates (-1 to +1) for both components
            let clientX, clientY;

            if (event.changedTouches) {
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }

            pointer.x = (clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);

            if (interactPromptMesh && interactPromptMesh.visible) {
                const intersects = raycaster.intersectObject(interactPromptMesh);
                if (intersects.length > 0) {
                    attemptInteraction();
                }
            }
        }

        const bgCanvas = document.getElementById('bg-canvas');
        if (bgCanvas) {
            bgCanvas.addEventListener('mousedown', onPointerDown);
            bgCanvas.addEventListener('touchstart', (e) => {
                // e.preventDefault(); // Don't block other touch behaviors yet
                onPointerDown(e);
            }, { passive: false });
        }
        // ------------------------------------------

        window.addEventListener("gamepadconnected", (e) => {
            gamepadStatus.style.display = 'block';
            updateUIText();
        });
        window.addEventListener("gamepaddisconnected", (e) => {
            gamepadStatus.style.display = 'none';
        });

        // ... (Gamepad vibration - Kept as is)
        function vibrateGamepad(duration = 50, strong = 0.8, weak = 0.8) {
            if (vibrationLevel === 0) return;
            const scale = vibrationLevel === 1 ? 0.5 : 1.0;
            const s = strong * scale;
            const w = weak * scale;
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

        function triggerMobileVibration(duration = 50) {
            if (vibrationLevel > 0 && navigator.vibrate) {
                navigator.vibrate(duration);
            }
        }

        function restartLevel() {
            if (!player) return;
            deathVideoContainer.style.display = 'none';
            deathVideoContainer.innerHTML = '';
            agonyOverlay.style.display = 'none';
            agonyOverlay.style.backgroundColor = 'transparent';
            player.health = player.maxHealth;
            player.energyBarFill.style.width = '100%';
            player.checkHealthStatus();
            player.mesh.position.set(0, 0.8, 0); // Reset to feet at 0.8
            player.mesh.scale.set(PLAYER_SCALE, PLAYER_SCALE, 1);
            player.mesh.visible = true;
            gameOverScreen.style.display = 'none';
            isPaused = false;
            if (audioContext.state === 'suspended') audioContext.resume();
            playAudio('ambiente', true);
            setAudioVolume('ambiente', musicVolumeSlider.value);
            setAudioVolume('pasos', sfxVolumeSlider.value);
            loadLevelById(currentLevelId);
            animate();
        }

        function triggerDeathSequence() {
            isPaused = true;
            cancelAnimationFrame(animationFrameId);
            for (let key in audioSources) {
                stopAudio(key);
            }
            for (let key in gainNodes) {
                try {
                    gainNodes[key].gain.cancelScheduledValues(audioContext.currentTime);
                    gainNodes[key].gain.setValueAtTime(0, audioContext.currentTime);
                } catch(e) {}
            }

            agonyOverlay.style.display = 'block';
            let startTime = null;
            const duration = 2000;
            const initialScale = player.mesh.scale.clone();

            function animateDeath(timestamp) {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                const currentScale = 1.0 - progress;
                player.mesh.scale.set(
                    initialScale.x * currentScale,
                    initialScale.y * currentScale,
                    initialScale.z * currentScale
                );
                if (elapsed < duration - 100) {
                     const flicker = Math.floor(elapsed / 50) % 4;
                     switch(flicker) {
                         case 0: agonyOverlay.style.backgroundColor = 'transparent'; break;
                         case 1: agonyOverlay.style.backgroundColor = 'white'; break;
                         case 2: agonyOverlay.style.backgroundColor = 'transparent'; break;
                         case 3: agonyOverlay.style.backgroundColor = 'black'; break;
                     }
                } else {
                     agonyOverlay.style.backgroundColor = 'white';
                }
                renderer.render(scene, camera);
                if (progress < 1.0) {
                    requestAnimationFrame(animateDeath);
                } else {
                    player.mesh.visible = false;
                    agonyOverlay.style.backgroundColor = 'black';
                    deathVideoContainer.style.display = 'flex';
                    agonyOverlay.style.display = 'none';
                    const video = document.createElement('video');
                    video.id = 'death-video-element';
                    video.src = 'assets/video/muerte-joziel.mp4';
                    video.autoplay = true;
                    video.playsInline = true;
                    video.controls = false;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'contain';
                    video.style.position = 'relative';
                    video.style.zIndex = '10001';
                    video.onended = () => {
                        deathVideoContainer.style.display = 'none';
                        deathVideoContainer.innerHTML = '';
                        gameOverScreen.style.display = 'flex';
                    };
                    deathVideoContainer.appendChild(video);
                    video.play().catch(e => {
                        console.error("Error playing death video:", e);
                        video.onended();
                    });
                }
            }
            requestAnimationFrame(animateDeath);
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

        // ... (Player Class - Kept as is)
        class Player {
             constructor() {
                this.runningTexture = textureLoader.load(assetUrls.runningSprite);
                this.runningBackTexture = textureLoader.load(assetUrls.runningBackSprite);
                this.runningShadowTexture = textureLoader.load(assetUrls.runningShadowSprite);
                this.idleTexture = textureLoader.load(assetUrls.idleSprite);
                this.idleBackTexture = textureLoader.load(assetUrls.idleBackSprite);
                this.idleShadowTexture = textureLoader.load(assetUrls.idleShadowSprite);
                this.attackTexture = textureLoader.load(assetUrls.attackSprite);
                this.attackBackTexture = textureLoader.load(assetUrls.attackBackSprite);
                this.jumpTexture = textureLoader.load(assetUrls.jumpSprite);
                this.jumpBackTexture = textureLoader.load(assetUrls.jumpBackSprite);

                // Configuración de Filtros (Pixel Art)
                [this.runningTexture, this.runningBackTexture, this.idleTexture, this.idleBackTexture,
                 this.attackTexture, this.jumpTexture, this.jumpBackTexture].forEach(tex => {
                    tex.magFilter = THREE.NearestFilter;
                    tex.minFilter = THREE.NearestFilter;
                });

                // Configuración de Repetición (Grid/Strip)
                // 1. Run (Right): 8x2 Grid (1011x371)
                this.runningTexture.repeat.set(0.125, 0.5);
                // 2. Run (Left): 8x2 Grid (1006x364)
                this.runningBackTexture.repeat.set(0.125, 0.5);

                // Shadows (Legacy _128 format usually) - assuming they match main sprite logic or handle separately
                this.runningShadowTexture.repeat.set(0.125, 0.5);

                // 3. Idle (Frontal): 6x2 Grid (11 frames: 6 top, 5 bottom)
                this.idleTexture.repeat.set(1/6, 0.5);
                this.idleBackTexture.repeat.set(1/6, 0.5); // Same asset

                this.idleShadowTexture.repeat.set(1 / totalIdleFrames, 1); // Legacy shadow?

                // 5. Jump (Right): 3x2 Grid (664x1014)
                this.jumpTexture.repeat.set(1/3, 0.5);
                // 6. Jump (Left): 8x1 Strip (1600x297)
                this.jumpBackTexture.repeat.set(0.125, 1);

                // 7. Attack (Right): 4x2 Grid (943x490)
                this.attackTexture.repeat.set(0.25, 0.5);
                // 8. Attack (Left): 6x1 Strip (Horizontal) - 1 Row Confirmed
                this.attackBackTexture.magFilter = THREE.NearestFilter;
                this.attackBackTexture.minFilter = THREE.NearestFilter;
                this.attackBackTexture.repeat.set(1/6, 1);

            // Carga
            this.chargingTexture = textureLoader.load(assetUrls.chargingSprite);
            this.chargingTexture.wrapS = THREE.RepeatWrapping;
            this.chargingTexture.wrapT = THREE.RepeatWrapping;
            this.chargingTexture.magFilter = THREE.NearestFilter;
            this.chargingTexture.minFilter = THREE.NearestFilter;
            this.chargingTexture.repeat.set(0.25, 0.25); // 4x4 Grid

                // RUN FRAMEMAPS (GRID 8x2)
                // Convention: Top Row (y=0.5) is frames 0-7, Bottom (y=0) is frame 8+
                this.runningFrameMap = [];
                for (let i = 0; i < 8; i++) {
                    this.runningFrameMap.push({ x: i * 0.125, y: 0.5 });
                }
                this.runningFrameMap.push({ x: 0, y: 0 }); // Frame 8

                this.runningBackFrameMap = [];
                for (let i = 0; i < 8; i++) {
                    this.runningBackFrameMap.push({ x: i * 0.125, y: 0.5 });
                }
                for (let i = 0; i < 3; i++) {
                    this.runningBackFrameMap.push({ x: i * 0.125, y: 0 }); // Frames 8,9,10
                }

                this.jumpFrameMap = [];
                for (let i = 0; i < 3; i++) this.jumpFrameMap.push({ x: i * (1/3), y: 0.5 });
                for (let i = 0; i < 3; i++) this.jumpFrameMap.push({ x: i * (1/3), y: 0.0 });


                const playerHeight = 4.2;
                const playerWidth = 4.2;

                const playerGeometry = new THREE.PlaneGeometry(playerWidth, playerHeight);
        playerGeometry.translate(0, (playerHeight / 2) - 0.8, 0); // Pivot at feet (Visual offset -0.8)

                const playerMaterial = new THREE.MeshBasicMaterial({
                    map: this.runningTexture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    alphaTest: 0.5,
                    depthWrite: false
                });
                this.standardMaterial = playerMaterial;

                // Material básico con transparencia PNG para carga de energía
                this.chargingMaterial = new THREE.MeshBasicMaterial({
                    map: this.chargingTexture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });

                this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.mesh.position.y = 0.8; // Feet at 0.8
                this.mesh.scale.set(PLAYER_SCALE, PLAYER_SCALE, 1);
                this.mesh.castShadow = true;
                this.mesh.frustumCulled = false;
                this.mesh.renderOrder = 0;
                scene.add(this.mesh);

                const glowMaterial = new THREE.MeshBasicMaterial({
                    map: null,
                    color: 0x00FFFF,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });

                this.glowMesh = new THREE.Mesh(playerGeometry, glowMaterial);
                this.glowMesh.position.set(0, 0, 0.05);
                this.glowMesh.frustumCulled = false;
                this.mesh.add(this.glowMesh);

                this.playerLight = new THREE.PointLight(0x00FFFF, 1.2, 12);
                scene.add(this.playerLight);

                this.floorLight = new THREE.PointLight(0x00FFFF, 2.0, 15);
        this.floorLight.position.set(0, 0.1, 0); // Relative to feet (0)
                this.mesh.add(this.floorLight);

                this.create3DProxy();

            // Charging State Variables
            this.chargingState = 'none'; // 'none', 'start', 'loop', 'end'
            this.chargingTimer = 0;
            this.currentChargeFrame = 0;

            // Idle State Variables
            this.idleTimer = 0;
            this.idleAnimTimer = 0;
            this.isPlayingSpecialIdle = false;

            // Suction Particles for Loop Phase
            this.suctionParticles = new ImpactParticleSystem(scene, this.mesh.position); // Reusing logic or creating simplified?
            // Actually ImpactParticleSystem is an explosion. We need implosion.
            // Let's create a custom particle group for suction using the spark texture.
            this.createSuctionParticles();

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
                this.invincibilityDuration = 2.0;
                this.invincibilityTimer = 0;
                this.isAbsorbing = false;
                this.hasPlayedIdleIntro = false;

                this.maxPower = 100;
                this.power = this.maxPower;
                this.powerBarFill = document.getElementById('power-fill');
            }

        createSuctionParticles() {
            const count = 20;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for(let i=0; i<count * 3; i++) positions[i] = 0;
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const mat = new THREE.PointsMaterial({
                map: textureLoader.load(assetUrls.sparkParticle),
                color: 0x00FFFF,
                size: 0.5,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.suctionPoints = new THREE.Points(geo, mat);
            this.suctionPoints.visible = false;
            this.mesh.add(this.suctionPoints); // Attach to player

            this.suctionData = [];
            for(let i=0; i<count; i++) {
                this.suctionData.push({
                    x: 0, y: 0, z: 0,
                    speed: 0,
                    angle: 0,
                    radius: 0
                });
            }
        }

        updateSuctionParticles(deltaTime) {
            if (this.chargingState !== 'loop') {
                this.suctionPoints.visible = false;
                return;
            }
            this.suctionPoints.visible = true;
            this.suctionPoints.material.opacity = 1.0;

            const positions = this.suctionPoints.geometry.attributes.position.array;

            for(let i=0; i<this.suctionData.length; i++) {
                let p = this.suctionData[i];
                if (p.radius <= 0.1) {
                    // Reset to outer rim
                    p.radius = 2.0 + Math.random() * 1.5;
                    p.angle = Math.random() * Math.PI * 2;
                    p.speed = 3.0 + Math.random() * 2.0;
                    // Random height relative to player center
                    p.y = (Math.random() - 0.5) * 3.0;
                }

                p.radius -= p.speed * deltaTime;

                const x = Math.cos(p.angle) * p.radius;
                const z = Math.sin(p.angle) * p.radius;

                positions[i*3] = x;
                positions[i*3+1] = p.y; // Keep Y relatively stable or spiral?
                positions[i*3+2] = z;
            }
            this.suctionPoints.geometry.attributes.position.needsUpdate = true;
            this.suctionPoints.rotation.y += 5.0 * deltaTime; // Rotate whole system
        }

            checkHealthStatus() {
                const pct = this.health / this.maxHealth;
                if (pct <= 0.2 && this.health > 0) {
                    this.energyBarFill.style.backgroundColor = '#8B0000';
                    energyBarContainer.classList.add('low-health-pulse');
                    playerProfileImage.classList.add('hud-shake');
                } else {
                    this.energyBarFill.style.backgroundColor = '#00ff00';
                    energyBarContainer.classList.remove('low-health-pulse');
                    playerProfileImage.classList.remove('hud-shake');
                }
            }

            restoreHealth(amount) {
                this.health = Math.min(this.maxHealth, this.health + amount);
                this.energyBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
                this.checkHealthStatus();
            }

            restorePower(amount) {
                this.power = Math.min(this.maxPower, this.power + amount);
                this.powerBarFill.style.width = `${(this.power / this.maxPower) * 100}%`;
            }

            restorePowerAndHealth() {
                this.restoreHealth(this.maxHealth * 0.05);
                this.restorePower(this.maxPower * 0.05);
            }

            applyKnockback(enemy) {
                const knockbackForce = 0.4;
                const direction = this.mesh.position.x > enemy.mesh.position.x ? 1 : -1;
                this.velocity.x = direction * knockbackForce;
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
                if (gainNodes['hurt'] && audioSources['hurt']) {
                    const now = audioContext.currentTime;
                    gainNodes['hurt'].gain.setValueAtTime(0.5, now);
                    gainNodes['hurt'].gain.linearRampToValueAtTime(0, now + 1.0);
                    audioSources['hurt'].stop(now + 1.0);
                }
                this.applyKnockback(enemy);
                this.energyBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
                this.checkHealthStatus();
                if (this.health <= 0) {
                    this.health = 0;
                    triggerDeathSequence();
                }
            }

            shoot(aimVector) {
                const powerCost = this.maxPower * 0.05;
                if (this.power < powerCost || this.shootCooldown > 0) return;
                this.power -= powerCost;
                this.powerBarFill.style.width = `${(this.power / this.maxPower) * 100}%`;
                if (this.shootCooldown > 0) return;
                vibrateGamepad(50, 0.5, 0.5);
                playAudio('fireball_cast', false, 0.9 + Math.random() * 0.2, 0.5, 0.4);
                playAudio('attack_voice', false, 0.9 + Math.random() * 0.2);

        const spawnX = this.isFacingLeft ? -1.5 : 1.5;
        const spawnY = 2.8; // Hand height from feet
        const startPosition = this.mesh.position.clone().add(new THREE.Vector3(spawnX, spawnY, 0)); // Z=0

                let direction = new THREE.Vector2(this.isFacingLeft ? -1 : 1, 0);
                if (Math.abs(aimVector.y) > 0.3) {
                    direction.y = aimVector.y;
                }
                direction.normalize();
                allProjectiles.push(new Projectile(scene, startPosition, direction));
                this.shootCooldown = this.shootCooldownDuration;
                this.currentState = 'shooting';
                this.currentFrame = -1; // Will start at 0 next update
            }

            create3DProxy() {
                this.proxyGroup = new THREE.Group();
                const material = new THREE.MeshStandardMaterial({
                    color: 0x000000,
                    roughness: 0.2,
                    metalness: 1.0,
                    transparent: true,
                    opacity: 0.1,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                const shadowMaterial = new THREE.MeshDepthMaterial({
                    depthPacking: THREE.RGBADepthPacking
                });
                const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.0, 8), material);
        torso.position.y = 1.9; // Shifted +2.1
                torso.castShadow = true;
                torso.customDepthMaterial = shadowMaterial;
                this.proxyGroup.add(torso);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), material);
        head.position.y = 3.3; // Shifted +2.1
                head.castShadow = true;
                head.customDepthMaterial = shadowMaterial;
                this.proxyGroup.add(head);
                const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
                const leftArm = new THREE.Mesh(armGeo, material);
        leftArm.position.set(-0.35, 2.5, 0); // Shifted +2.1
                leftArm.rotation.z = Math.PI / 6;
                leftArm.castShadow = true;
                leftArm.customDepthMaterial = shadowMaterial;
                this.proxyGroup.add(leftArm);
                const rightArm = new THREE.Mesh(armGeo, material);
        rightArm.position.set(0.35, 2.5, 0); // Shifted +2.1
                rightArm.rotation.z = -Math.PI / 6;
                rightArm.castShadow = true;
                rightArm.customDepthMaterial = shadowMaterial;
                this.proxyGroup.add(rightArm);
                this.proxyGroup.position.z = -0.2;
                this.mesh.add(this.proxyGroup);
            }


            update(deltaTime, controls) {
                const wasFacingLeft = this.isFacingLeft;
                this.isAbsorbing = controls.attackHeld;

                if (this.isInvincible) {
                    this.invincibilityTimer -= deltaTime;
                    this.mesh.material.opacity = (Math.floor(this.invincibilityTimer * 10) % 2 === 0) ? 0.5 : 1.0;
                    if (this.invincibilityTimer <= 0) {
                        this.isInvincible = false;
                        this.mesh.material.opacity = 1.0;
                    }
                }

                if (this.shootCooldown > 0) {
                    this.shootCooldown -= deltaTime;
                }
                // Shooting state is now controlled by animation completion, not timer
                // if (this.shootingTimer > 0) { ... }

                const joyX = controls.joyVector.x;
                const joyY = controls.joyVector.y;
                const isMoving = Math.abs(joyX) > 0.1;
                const previousState = this.currentState;

                if (isMoving) {
                    this.velocity.x = moveSpeed * joyX;
                    this.isFacingLeft = joyX < 0;
                } else {
                    this.velocity.x *= 0.9;
                }

                if (this.currentState !== 'shooting') {
                    const isJumpingInput = joyY > 0.5;
                    const isMovingInput = Math.abs(joyX) > 0.1;

                // CHARGING LOGIC
                    if (controls.attackHeld && !isMovingInput && !isJumpingInput) {
                    this.currentState = 'charging';
                    if (this.chargingState === 'none' || this.chargingState === 'end') {
                        this.chargingState = 'start';
                        this.currentChargeFrame = 0;
                            playAudio('charge', true, 0.9 + Math.random() * 0.2, 4.0);
                        vibrateGamepad(100, 0.8, 0.8);
                        }
                    // Power Regen during Loop
                    if (this.chargingState === 'loop') {
                        if (this.power < this.maxPower) {
                            this.power += 10 * deltaTime;
                            if (this.power > this.maxPower) this.power = this.maxPower;
                            this.powerBarFill.style.width = `${(this.power / this.maxPower) * 100}%`;
                        }
                        }
                    } else {
                    // Released button or moving
                    if (this.chargingState === 'start' || this.chargingState === 'loop') {
                        this.chargingState = 'end';
                        this.currentChargeFrame = 12; // Start of end sequence
                        stopAudio('charge');
                    } else if (this.chargingState === 'end') {
                        // Let it play out, but allow movement physics below
                    } else {
                        this.chargingState = 'none';
                        stopAudio('charge');
                        }

                    if (this.chargingState === 'none') {
                        // Normal Movement Logic
                        if (isJumpingInput && this.isGrounded && !this.jumpInputReceived) {
                            this.isJumping = true;
                            this.isGrounded = false;
                            this.velocity.y = this.jumpPower;
                            this.currentState = 'jumping';
                            this.currentFrame = -1;
                            this.jumpInputReceived = true;
                            playAudio('jump', false, 0.9 + Math.random() * 0.2, 0.5, 0.1);
                            vibrateGamepad(100, 0.5, 0.5);
                        } else if (!isJumpingInput) {
                            this.jumpInputReceived = false;
                            }
                        if (isMoving && !this.isJumping) {
                            this.currentState = 'running';
                            if (Math.random() < 0.3) {
                                allFootstepParticles.push(new FootstepParticle(scene, this.mesh.position.x, 0.2, this.mesh.position.z));
                            }
                        } else if (!this.isJumping && this.currentState !== 'landing') {
                            this.currentState = 'idle';
                        }
                    } else {
                        // In 'end' phase, we override state to 'charging' to play animation, but allow movement
                        this.currentState = 'charging';
                        // Allow movement inputs to affect velocity even if animation is finishing discharge
                        if (isMoving) {
                             this.velocity.x = moveSpeed * joyX;
                             this.isFacingLeft = joyX < 0;
                        }
                        }
                    }
                } else {
                    if (audioSources['charge']) stopAudio('charge');
                }

                if (!this.isGrounded) this.velocity.y += this.gravity;
                this.mesh.position.y += this.velocity.y;
                this.mesh.position.x += this.velocity.x;
                this.mesh.position.z = 0; // Force Z 0

        if (this.mesh.position.y <= 0.8) { // Check against floor (0.8)
            this.mesh.position.y = 0.8; // Reset to floor
                    if (!this.isGrounded) {
                        this.isGrounded = true;
                        this.isJumping = false;
                        this.velocity.y = 0;
                        const isMovingInput = Math.abs(controls.joyVector.x) > 0.1;
                        const isJumpingInput = controls.joyVector.y > 0.5;
                        if (isMovingInput || isJumpingInput) {
                             this.currentState = 'idle';
                        } else {
                             this.currentState = 'landing';
                             this.currentFrame = -1;
                        }
                    }
                }
                this.mesh.position.x = Math.max(this.minPlayerX, Math.min(this.maxPlayerX, this.mesh.position.x));

                const isMovementState = ['idle', 'running', 'jumping', 'landing', 'charging'].includes(this.currentState);
                if (isMovementState) {
                     this.mesh.rotation.y = 0;
                } else {
                     // Charging and Shooting flip with rotation
                     // EXCEPTION: Left Shooting uses a pre-drawn left sprite, so DO NOT rotate (mirror) it.
                     if (this.currentState === 'shooting' && this.isFacingLeft) {
                         this.mesh.rotation.y = 0;
                     } else {
                         this.mesh.rotation.y = this.isFacingLeft ? Math.PI : 0;
                     }
                }

                // FORCE NO MIRROR FOR NEW IDLE
                if (this.currentState === 'idle') {
                    this.mesh.rotation.y = 0;
                    this.idleTimer += Math.min(deltaTime, 0.1); // Cap to prevent lag spikes triggering anim
                    this.idleAnimTimer += deltaTime;
                } else {
                    this.idleAnimTimer = 0;
                }

                camera.position.x = this.mesh.position.x;
                const targetCameraY = this.mesh.position.y + 6;
                camera.position.y += (targetCameraY - camera.position.y) * 0.05;
                this.playerLight.position.set(this.mesh.position.x, this.mesh.position.y + 1, this.mesh.position.z + 2);

            if (this.currentState !== previousState && this.currentState !== 'charging') this.currentFrame = -1;
            if (this.currentState !== 'idle') {
                this.idleTimer = 0;
                this.idleAnimTimer = 0;
                this.isPlayingSpecialIdle = false;
            }

            // Update Suction Particles
            this.updateSuctionParticles(deltaTime);

                let currentAnimSpeed = animationSpeed;
                if (this.currentState === 'idle') {
                    // Frame 0: Pause for 3 seconds (breathing)
                    if (this.currentFrame === 0) {
                        currentAnimSpeed = 3000;
                    } else {
                        // Frames 1-10: Slow animation (5 FPS)
                        currentAnimSpeed = 200;
                    }
                }
                if ((this.currentState === 'jumping' || this.currentState === 'landing') && this.isFacingLeft) {
                    currentAnimSpeed = 60;
                }

                const stateChanged = this.currentState !== previousState;
                const directionChanged = (this.currentState === 'running' || this.currentState === 'jumping' || this.currentState === 'landing' || this.currentState === 'idle') && this.isFacingLeft !== wasFacingLeft;
                if (stateChanged || directionChanged) {
                     this.hasPlayedIdleIntro = false;
                }

                // --- DYNAMIC SCALING LOGIC ---
                // Folder-Based Logic applied to Player (All assets in Joziel -> 1.15)
                const currentScale = getScaleFromPath('assets/sprites/Joziel/');

                // Aplicar CALCULADORA UNIVERSAL DE ASPECT RATIO
                updateSizeFromAspectRatio(this.mesh, currentScale);


                if (stateChanged || directionChanged) {
                    this.currentFrame = -1;
                    this.lastFrameTime = 0;
                    if (this.currentState === 'running' && this.isFacingLeft && wasFacingLeft) {
                        this.currentFrame = 2;
                    }
                }

                if (Date.now() - this.lastFrameTime > currentAnimSpeed) {
                    this.lastFrameTime = Date.now();
                    let totalFrames, currentTexture, shadowTexture;
                    let isGridSprite = false;
                    let isJumpSprite = false;
                    let isIdleSprite = false;
                    let isManualUV = false;

                    switch (this.currentState) {
                        case 'shooting':
                            if (this.isFacingLeft) {
                                // Specific Left-Side Attack (Strip 6 frames)
                                currentTexture = this.attackBackTexture;
                                shadowTexture = null;
                                isGridSprite = false;
                                isManualUV = false; // It's a strip now!
                                totalFrames = 6;
                                currentAnimSpeed = 40;

                                if (this.currentFrame < 5) {
                                    this.currentFrame++;
                                } else {
                                    this.currentState = 'idle';
                                }
                            } else {
                                // Right-Side Attack (Grid 4x2)
                                currentTexture = this.attackTexture;
                                shadowTexture = null;
                                isGridSprite = false;
                                isManualUV = true;
                                currentAnimSpeed = 40;

                                if (this.currentFrame < 7) {
                                    this.currentFrame++;
                                } else {
                                    this.currentState = 'idle';
                                }

                                const sFrame = this.currentFrame;
                                const sCol = sFrame % 4;
                                const sRow = Math.floor(sFrame / 4);
                                currentTexture.offset.x = sCol * 0.25;
                                currentTexture.offset.y = (1 - sRow) * 0.5;
                            }
                            break;
                    case 'charging':
                        currentTexture = this.chargingTexture;
                        shadowTexture = null;
                        isGridSprite = false;
                        isManualUV = true;

                        // Custom Animation Logic for Charging
                        let speed = 100; // default start
                        if (this.chargingState === 'start') {
                            speed = 100;
                            if (this.currentChargeFrame < 3) {
                                this.currentChargeFrame++;
                            } else {
                                this.chargingState = 'loop';
                                this.currentChargeFrame = 4;
                            }
                        } else if (this.chargingState === 'loop') {
                            speed = 40; // Extreme speed
                            this.currentChargeFrame++;
                            if (this.currentChargeFrame > 11) this.currentChargeFrame = 4;
                        } else if (this.chargingState === 'end') {
                            speed = 80;
                            if (this.currentChargeFrame < 13) {
                                this.currentChargeFrame++;
                            } else {
                                this.chargingState = 'none';
                                this.currentState = 'idle'; // Reset to idle
                            }
                        }

                        const cFrame = this.currentChargeFrame;
                        const cCol = cFrame % 4;
                        const cRow = Math.floor(cFrame / 4);

                        currentTexture.offset.x = cCol * 0.25;
                        currentTexture.offset.y = (3 - cRow) * 0.25;

                        // Set speed for next frame
                        currentAnimSpeed = speed;
                            break;

                        case 'running':
                            if (this.isFacingLeft) {
                                totalFrames = 11;
                                currentTexture = this.runningBackTexture;
                                shadowTexture = this.runningShadowTexture;
                                this.currentFrame++;
                                if (this.currentFrame >= totalFrames) {
                                    this.currentFrame = 5;
                                }
                                isGridSprite = true;
                            } else {
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
                                // Left Jump: Strip 8 frames
                                currentTexture = this.jumpBackTexture;
                                shadowTexture = this.runningShadowTexture;
                                if (this.velocity.y > 0) {
                                    if (this.currentFrame === -1) this.currentFrame = 7;
                                    else this.currentFrame--;
                                    if (this.currentFrame === 5) this.currentFrame = 4;
                                    if (this.currentFrame < 4) this.currentFrame = 4;
                                } else {
                                    this.currentFrame = 5;
                                }
                             } else {
                                // Right Jump: Grid 3x2
                                currentTexture = this.jumpTexture;
                                shadowTexture = this.runningShadowTexture;
                                isJumpSprite = true;
                                if (this.currentFrame === -1) {
                                    this.currentFrame = 0;
                                } else if (this.currentFrame === 0) {
                                     this.currentFrame = 2;
                                } else if (this.velocity.y > 0) {
                                     this.currentFrame = 2;
                                } else {
                                     this.currentFrame = 1;
                                }
                             }
                             break;
                        case 'landing':
                            if (this.isFacingLeft) {
                                currentTexture = this.jumpBackTexture;
                                shadowTexture = this.runningShadowTexture;
                                if (this.currentFrame === -1 || this.currentFrame > 1) this.currentFrame = 1;
                                else this.currentFrame--;
                                if (this.currentFrame < 0) {
                                    this.currentState = 'idle';
                                }
                            } else {
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
                            // Unified Frontal Idle System (6 cols x 2 rows = 11 frames)
                            // Row 0: 6 frames, Row 1: 5 frames
                            [totalFrames, currentTexture, shadowTexture] = [11, this.idleTexture, null];

                            this.idleTexture.repeat.set(1/6, 0.5);
                            this.idleTexture.magFilter = THREE.NearestFilter;
                            this.idleTexture.minFilter = THREE.NearestFilter;

                            isIdleSprite = true;

                            // Stepped Animation Logic (8 FPS)
                    // Simple Accumulator: Just increment, NO interpolation or math tricks
                    this.currentFrame = (this.currentFrame + 1) % 11;
                            break;
                        default:
                            [totalFrames, currentTexture, shadowTexture] = [totalIdleFrames, this.idleTexture, this.idleShadowTexture];
                            this.currentFrame = 0;
                            isIdleSprite = true;
                            break;
                    }

                    // Material Swapping Logic for Charging State
                    if (this.currentState === 'charging') {
                        if (this.mesh.material !== this.chargingMaterial) {
                            this.mesh.material = this.chargingMaterial;
                        }
                    } else {
                        if (this.mesh.material !== this.standardMaterial) {
                            this.mesh.material = this.standardMaterial;
                        }
                    }

                    if (currentTexture) {
                        if (this.mesh.material === this.standardMaterial) {
                            this.mesh.material.map = currentTexture;
                        }
                        if (isGridSprite) {
                            let frameMap = this.runningFrameMap;
                            if (this.isFacingLeft && this.currentState === 'running') {
                                frameMap = this.runningBackFrameMap;
                            }
                            const frameData = frameMap[this.currentFrame];
                            if (frameData) {
                                currentTexture.offset.set(frameData.x, frameData.y);
                            }
                        } else if (isJumpSprite) {
                             const frameData = this.jumpFrameMap[this.currentFrame];
                             if (frameData) {
                                 currentTexture.offset.set(frameData.x, frameData.y);
                             }
                        } else if (isIdleSprite) {
                            // NEW: Idle 6x2 Grid (Frames 0-10)
                            const cols = 6;
                            const rows = 2;

                            // Adjust for 11 frames total distributed across 2 rows
                            // Frames 0-5 -> Row 0
                            // Frames 6-10 -> Row 1
                            const col = this.currentFrame % cols;
                            const row = Math.floor(this.currentFrame / cols);

                            currentTexture.offset.x = col / cols;
                            currentTexture.offset.y = (rows - 1 - row) / rows;

                        } else if (!isManualUV) {
                            // Strip Logic
                            let framesInStrip = totalFrames;
                            if (currentTexture === this.jumpBackTexture) framesInStrip = 8;
                            if (currentTexture === this.attackBackTexture) framesInStrip = 6;
                            // idleBackTexture removed from strip logic as it uses grid now

                            const uOffset = this.currentFrame / framesInStrip;
                            currentTexture.offset.x = uOffset;
                            currentTexture.offset.y = 0;
                        }
                    }

                    if (shadowTexture) {
                        this.glowMesh.visible = true;
                        if (this.glowMesh.material.map !== shadowTexture) {
                            this.glowMesh.material.map = shadowTexture;
                        }
                        if (this.isFacingLeft && (this.currentState === 'running' || this.currentState === 'idle')) {
                            this.glowMesh.scale.x = -1;
                            if (this.currentState === 'idle') {
                                this.glowMesh.visible = false;
                            }
                            if (this.currentFrame >= 5) {
                                const shadowFrameIndex = 5 + ((this.currentFrame - 5) % 4);
                                const shadowFrameData = this.runningFrameMap[shadowFrameIndex];
                                if (shadowFrameData) {
                                    this.glowMesh.material.map.offset.set(shadowFrameData.x, shadowFrameData.y);
                                }
                                this.glowMesh.material.map.repeat.set(0.125, 0.5);
                            } else {
                                this.glowMesh.visible = false;
                            }
                        } else {
                            this.glowMesh.scale.x = 1;
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

        class HUDProjectile {
            constructor(scene, startPosition, type) {
                this.scene = scene;
                this.type = type;
                this.startPos = startPosition.clone();
                this.targetElement = null;

                if (type === 'health') {
                    this.targetElement = document.getElementById('energy-bar');
                } else if (type === 'power') {
                    this.targetElement = document.getElementById('power-bar');
                } else {
                    this.targetElement = document.getElementById('souls-container'); // Or spectral bar? defaulting to souls/spectral
                    if (!this.targetElement) this.targetElement = document.getElementById('spectral-bar');
                }

                // Project 3D start pos to 2D screen pos
                const vector = this.startPos.clone();
                vector.project(camera);

                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

                // Create DOM Element
                this.element = document.createElement('div');
                this.element.style.position = 'fixed';
                this.element.style.left = `${x}px`;
                this.element.style.top = `${y}px`;
                this.element.style.width = '20px';
                this.element.style.height = '20px';
                this.element.style.borderRadius = '50%';
                this.element.style.zIndex = '10001';
                this.element.style.pointerEvents = 'none';

                // Color based on type
                if (type === 'health') this.element.style.backgroundColor = '#00ff00';
                else if (type === 'power') this.element.style.backgroundColor = '#00aaff';
                else this.element.style.backgroundColor = '#aa00ff'; // Soul/Spectral

                this.element.style.boxShadow = `0 0 10px ${this.element.style.backgroundColor}`;
                this.element.style.transition = 'all 0.5s ease-in';

                document.body.appendChild(this.element);

                // Trigger Animation
                requestAnimationFrame(() => {
                    if (this.targetElement) {
                        const rect = this.targetElement.getBoundingClientRect();
                        const targetX = rect.left + rect.width / 2;
                        const targetY = rect.top + rect.height / 2;

                        this.element.style.left = `${targetX}px`;
                        this.element.style.top = `${targetY}px`;
                        this.element.style.opacity = '0'; // Fade out as it arrives
                    }
                });

                // Cleanup and Apply Effect after animation
                setTimeout(() => {
                    if (this.element && this.element.parentNode) {
                        this.element.parentNode.removeChild(this.element);
                    }
                    this.applyEffect();
                }, 500); // Match transition time
            }

            applyEffect() {
                if (!player) return;
                if (this.type === 'health') player.restoreHealth(10);
                else if (this.type === 'power') player.restorePower(15);
                // Soul logic if needed
            }

            update(deltaTime) {
                // Dummy update to satisfy main loop if added to allProjectiles
                // Since this is DOM based, we return false immediately to remove from THREE.js array?
                // Actually, LootItem calls allProjectiles.push(new HUDProjectile...)
                // Main loop calls update(). If false, removes.
                // We return FALSE so it is removed from the game logic array immediately,
                // as the DOM animation runs independently.
                return false;
            }
        }

        function spawnLoot(scene, position, type) {
             allPowerUps.push(new LootItem(scene, position, type));
        }

        // Expose classes to global scope for testing/verification
        window.spawnLoot = spawnLoot;
        window.HUDProjectile = HUDProjectile;

        // ... (Environment & Decor - Kept as is)
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

        const floorGeometry = new THREE.PlaneGeometry(playableAreaWidth, roomDepth);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: textureLoader.load(assetUrls.floorTexture),
            roughness: 0.8,
            color: 0x888888,
            side: THREE.DoubleSide
        });
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: textureLoader.load(assetUrls.wallTexture),
            roughness: 0.9,
            color: 0x888888,
            side: THREE.DoubleSide
        });
        const doorMaterial = new THREE.MeshStandardMaterial({
            map: textureLoader.load(assetUrls.doorTexture),
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });

        function generateNoiseTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000'; ctx.fillRect(0,0,64,64);
            for(let i=0; i<200; i++) {
                ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.1})`;
                ctx.beginPath();
                ctx.arc(Math.random()*64, Math.random()*64, Math.random()*2, 0, Math.PI*2);
                ctx.fill();
            }
            return new THREE.CanvasTexture(canvas);
        }

        function generateElectricTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            const cx = 32; const cy = 32;

            // Clear
            ctx.clearRect(0, 0, 64, 64);

            // Glow Gradient
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Core White
            grad.addColorStop(0.3, 'rgba(0, 255, 255, 0.8)'); // Cyan Inner
            grad.addColorStop(0.6, 'rgba(0, 200, 255, 0.2)'); // Blueish Outer
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 64, 64);

            // "Lightning" Starburst lines
            ctx.strokeStyle = 'rgba(200, 255, 255, 0.8)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const len = 10 + Math.random() * 15;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
                ctx.stroke();
            }

            return new THREE.CanvasTexture(canvas);
        }

        class FootstepParticle {
            constructor(scene, x, y, z) {
                this.scene = scene;
                this.life = 1.0;
                const geo = new THREE.PlaneGeometry(0.3, 0.3);
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                this.mesh = new THREE.Mesh(geo, mat);
                this.mesh.position.set(x, y + 0.05, z);
                this.mesh.rotation.x = -Math.PI/2;
                scene.add(this.mesh);
            }
            update(dt) {
                // Optimization: Sleep if off-screen
                if (Math.abs(this.mesh.position.x - camera.position.x) > 35) return true;

                this.life -= dt;
                this.mesh.material.opacity = this.life * 0.5;
                this.mesh.scale.multiplyScalar(1.02);
                if(this.life <= 0) {
                    this.scene.remove(this.mesh);
                    return false;
                }
                return true;
            }
        }

        class AmbientTorchFlame {
            constructor(scene, pos) {
                this.scene = scene;
                this.texture = textureLoader.load(assetUrls.blueFire);
                this.texture.repeat.set(1/8, 0.5); // 8 cols, 2 rows

                // Additive Blending to remove black background
                const mat = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    color: 0x00aaff,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                // Use Mesh (Plane) instead of Sprite for correct UV Grid Animation
                this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
                this.mesh.position.copy(pos);
                // Adjust scale slightly to match visual
                this.mesh.scale.set(3.6, 3.6, 1);

                scene.add(this.mesh);
                allFlames.push(this);

                this.currentFrame = Math.floor(Math.random() * 16);
                this.frameTimer = 0;
                this.totalFrames = 16;
                this.cols = 8;
                this.rows = 2;
            }
            update(dt) {
                // Optimization: Sleep if off-screen
                if (Math.abs(this.mesh.position.x - camera.position.x) > 35) return true;

                // Face camera (Billboarding)
                this.mesh.lookAt(camera.position);

                this.frameTimer += dt;
                if(this.frameTimer > 0.05) { // ~20 FPS
                    this.frameTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % this.totalFrames;

                    const col = this.currentFrame % this.cols;
                    const row = Math.floor(this.currentFrame / this.cols); // 0 (top) or 1 (bottom)

                    // Grid 8x2 Calculation
                    // Row 0 (Top): v=0.5
                    // Row 1 (Bottom): v=0.0
                    this.texture.offset.x = col / this.cols;
                    this.texture.offset.y = (this.rows - 1 - row) * 0.5;
                }
                return true;
            }
        }

        class RealisticFlame {
            constructor(scene, pos, scale=1) {
                this.scene = scene;
                this.life = 0.5;

                this.texture = textureLoader.load(assetUrls.blueFire);
                this.texture.repeat.set(1/8, 0.5);

                const mat = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    color: 0x00aaff,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
                this.mesh.position.copy(pos);
                this.mesh.scale.setScalar(scale);
                scene.add(this.mesh);

                this.currentFrame = 0;
                this.frameTimer = 0;
            }
            update(dt) {
                this.life -= dt;

                // Fade out
                this.mesh.material.opacity = Math.max(0, this.life * 2);

                // Face camera
                this.mesh.lookAt(camera.position);

                // Animate
                this.frameTimer += dt;
                if(this.frameTimer > 0.05) {
                    this.frameTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % 16;

                    const col = this.currentFrame % 8;
                    const row = Math.floor(this.currentFrame / 8);

                    this.texture.offset.x = col / 8;
                    this.texture.offset.y = (1 - row) * 0.5;
                }

                if(this.life <= 0) {
                    this.scene.remove(this.mesh);
                    return false;
                }
                return true;
            }
        }

        class DustSystem {
            constructor(scene) {
                this.scene = scene;
                this.particles = [];
                const tex = textureLoader.load(assetUrls.dustParticle);
                const mat = new THREE.SpriteMaterial({
                    map: tex, color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false
                });
                for(let i=0; i<60; i++) {
                    const p = new THREE.Sprite(mat);
                    p.position.set(
                        (Math.random()-0.5)*120,
                        Math.random()*15,
                        camera.position.z - Math.random()*roomDepth
                    );
                    p.scale.setScalar(0.2 + Math.random()*0.3);
                    p.userData = { speed: 0.2 + Math.random()*0.3 };
                    scene.add(p);
                    this.particles.push(p);
                }
            }
            update() {
                this.particles.forEach(p => {
                    p.position.y -= p.userData.speed * 0.05;
                    if(p.position.y < 0) p.position.y = 15;
                });
            }
            setLightningState(val) {
                this.particles.forEach(p => {
                     p.material.opacity = 0.4 + (val > 0 ? 0.4 : 0);
                     if(val > 0) p.material.color.setHex(0xaaddff);
                     else p.material.color.setHex(0xffffff);
                });
            }
        }

        function createTorch(x, y, z, isLit) {
            const mat = new THREE.SpriteMaterial({ map: textureLoader.load(assetUrls.torchTexture), depthWrite: false });
            const mesh = new THREE.Sprite(mat);
            mesh.position.set(x, y, z);
            mesh.scale.set(1, 2, 1);
            scene.add(mesh);
            if(isLit) {
                new AmbientTorchFlame(scene, new THREE.Vector3(x, y+1.8, z+0.1));
                const light = new THREE.PointLight(0x00aaff, 1, 8);
                light.position.set(x, y, z+0.5);
                scene.add(light);
            }
        }

        function createGodRays(scene) {
             const geo = new THREE.PlaneGeometry(10, 30);
             const mat = new THREE.MeshBasicMaterial({
                 color: 0x00aaff,
                 transparent: true,
                 opacity: 0.05,
                 side: THREE.DoubleSide,
                 blending: THREE.AdditiveBlending,
                 depthWrite: false
             });
             for(let i=0; i<4; i++) {
                 const ray = new THREE.Mesh(geo, mat);
                 ray.position.set((Math.random()-0.5)*80, 10, -5);
                 ray.rotation.z = 0.2 + Math.random()*0.2;
                 scene.add(ray);
             }
        }

        function addDecals(scene, levelData) {
            const decalMat = new THREE.MeshBasicMaterial({
                map: generateNoiseTexture(),
                transparent: true,
                opacity: 0.3,
                blending: THREE.MultiplyBlending,
                depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -1
            });
            for(let i=0; i<10; i++) {
                const dirt = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), decalMat);
                dirt.position.set((Math.random()-0.5)*80, Math.random()*10, -14.9);
                scene.add(dirt);
            }
        }
        function areAllRoomsComplete() {
            return completedRooms.room_1 && completedRooms.room_2 && completedRooms.room_3 && completedRooms.room_4 && completedRooms.room_5;
        }

        function clearSceneForLevelLoad() {
            for (let i = scene.children.length - 1; i >= 0; i--) {
                const obj = scene.children[i];
                if (obj !== player.mesh && obj !== player.playerLight && !(obj instanceof THREE.Camera) && !(obj instanceof THREE.Light) && obj !== interactPromptMesh) {
                    scene.remove(obj);
                }
            }
            allFlames.length = 0;
            allFootstepParticles.length = 0;
            // Removed allSpecters.length = 0
            allSimpleEnemies.forEach(enemy => {
                 if (enemy.stopAudio) enemy.stopAudio();
                 scene.remove(enemy.mesh);
            });
            allSimpleEnemies.length = 0;
            allEnemiesX1.forEach(enemy => {
                 if (enemy.stopAudio) enemy.stopAudio();
                 scene.remove(enemy.mesh);
            });
            allEnemiesX1.length = 0;
            // Removed allWalkingMonsters cleanup
            allDecorGhosts.forEach(ghost => {
                 if (ghost.stopAudio) ghost.stopAudio();
                 scene.remove(ghost.mesh);
            });
            allDecorGhosts.length = 0;
            allGates.length = 0;
            allStatues.length = 0;
            allOrbs.length = 0;
            allPuzzles.length = 0;
            // numeralsContainer.innerHTML = ''; // REMOVED
            if (interactPromptMesh) interactPromptMesh.visible = false;
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
                const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), doorShadowMaterial);
                shadowMesh.rotation.x = -Math.PI / 2;
                shadowMesh.position.set(0, 0.1, 1.0);
                gateGroup.add(shadowMesh);
                gateGroup.position.x = gateData.x;
                gateGroup.position.z = camera.position.z - roomDepth;
                scene.add(gateGroup);

                let isLit = completedRooms[gateData.destination];
                if (levelData.id !== 'dungeon_1') {
                    // Inside a room, the torches reflect if the current room is cleared
                    isLit = completedRooms[levelData.id];
                }

                // 3D Numeral Mesh
                const numeralTexture = createRomanNumeralTexture(gateData.numeral, isLit);
                const numeralMat = new THREE.MeshBasicMaterial({
                    map: numeralTexture,
                    transparent: true,
                    depthWrite: false, // Ensure transparency works but position handles Z-sorting
                    side: THREE.DoubleSide
                });
                const numeralMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), numeralMat);
                // Position relative to gate group (local coords)
                // gateGroup is at x, 4, 0.3. Wait, gateGroup is at WORLD position.
                // gateMesh is at 0, 4, 0.3 relative to Group.
                // We want numeral above gate.
                // Let's add it to the GROUP so it moves with it.
                numeralMesh.position.set(0, 9.0, 0.3); // High above the door (y=4 + 5?)
                gateGroup.add(numeralMesh);

                allGates.push({ mesh: gateGroup, id: gateData.id, destination: gateData.destination, numeralMesh: numeralMesh });
                createTorch(gateData.x - 6, 3.2, camera.position.z - roomDepth + 0.5, isLit);
                createTorch(gateData.x + 6, 3.2, camera.position.z - roomDepth + 0.5, isLit);
            });

            // Removed specters loading loop
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
                        statueData.dialogueKey
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

            // --- NIGHTMARE LOGIC START ---
            // If room_1 to room_5 (Nightmare Mode)
            const isNightmareRoom = ['room_1','room_2','room_3','room_4','room_5'].includes(levelId);

            if (isNightmareRoom) {
                // Penumbra
                ambientLight.intensity = 0.3; // Darker

                // Update UI with REAL USER DATA
                if (window.currentUserData) {
                     const profileImg = document.getElementById('player-profile-image');
                     const nameLabel = document.querySelector('.stat-label');

                     if (profileImg && window.currentUserData.photoURL) {
                         profileImg.src = window.currentUserData.photoURL;
                     }
                     if (nameLabel && window.currentUserData.displayName) {
                         nameLabel.textContent = window.currentUserData.displayName.toUpperCase();
                     }
                }

            } else {
                ambientLight.intensity = 0.8; // Normal
            }
            // --- NIGHTMARE LOGIC END ---

            loadLevel(levelData); // This calls createTorch.

            if (isNightmareRoom) {
                // Remove the default lit torches at the exit (x=0) if not cleared.
                if (!completedRooms[levelId + "_cleared"]) {
                    // We need to find and remove flames near x=0
                    // Exit gate is at x=0. Torches at +/- 6.
                    for (let i = allFlames.length - 1; i >= 0; i--) {
                        if (Math.abs(allFlames[i].mesh.position.x) < 10) {
                             scene.remove(allFlames[i].mesh);
                             allFlames.splice(i, 1);
                        }
                    }
                    // Also remove point lights?
                    scene.children.forEach(child => {
                        if (child instanceof THREE.PointLight && Math.abs(child.position.x) < 10 && child.position.z < 0) {
                            child.intensity = 0; // Turn off
                        }
                    });
                }
            }

            // --- SPAWN LOGIC: 1 Enemy per Room (Rooms 1-5) ---
            if (['room_1', 'room_2', 'room_3', 'room_4', 'room_5'].includes(levelId)) {
                if (!completedRooms[levelId]) {
                    // Ensure only 1 enemy is spawned for testing/flow
                    if (allEnemiesX1.length === 0 && allSimpleEnemies.length === 0) {
                        allEnemiesX1.push(new EnemyX1(scene, 0));
                    }
                }
            }

            if (levelId === 'dungeon_1') {
                 if (allEnemiesX1.length === 0) {
                    const gateKeeper = new EnemyX1(scene, -40);
                    gateKeeper.isGatekeeper = true;
                    allEnemiesX1.push(gateKeeper);
                }

                // Intro Logic: If First Flame not triggered, force Gate 1 torches OFF.
                if (!firstFlameTriggered) {
                     // Gate 1 is at x=-50. Torches at -56, -44.
                     for (let i = allFlames.length - 1; i >= 0; i--) {
                        if (Math.abs(allFlames[i].mesh.position.x - (-50)) < 10) {
                             scene.remove(allFlames[i].mesh);
                             allFlames.splice(i, 1);
                        }
                    }
                    // Remove lights
                    scene.children.forEach(child => {
                        if (child instanceof THREE.PointLight && Math.abs(child.position.x - (-50)) < 10) {
                            child.intensity = 0;
                        }
                    });
                }

                if (allDecorGhosts.length === 0) {
                    allDecorGhosts.push(new DecorGhost(scene, 0));
                }
            }

            if (player) {
                player.mesh.position.x = spawnX !== null ? spawnX : 0;
                player.mesh.position.y = 0.8; // Feet at 0.8
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
                specters: [], // Cleared
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


        class SimpleEnemy {
             constructor(scene, initialX) {
                this.scene = scene;
                this.texture = textureLoader.load(assetUrls.enemySprite);
                this.texture.repeat.x = 1 / totalEnemyFrames;
                const enemyHeight = 5.6;
                const enemyWidth = 1.8;
                const enemyMaterial = new THREE.MeshStandardMaterial({
                    map: this.texture,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide
                });
                const enemyGeometry = new THREE.PlaneGeometry(enemyWidth, enemyHeight);
                this.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);

                // Scale Logic
                const scale = getScaleFromPath(assetUrls.enemySprite);
                this.mesh.scale.set(scale, scale, 1);

                this.mesh.position.set(initialX, enemyHeight / 2, 0);
                this.mesh.castShadow = true;
                this.scene.add(this.mesh);
                this.hitCount = 0;
                this.isAlive = true;
                this.state = 'PATROL';
                this.detectionRange = 6.0;
                this.patrolSpeed = 0.03;
                this.pursueSpeed = 0.045;
                this.currentFrame = 0;
                this.lastFrameTime = 0;
                this.direction = -1;
                this.patrolRange = { min: -playableAreaWidth / 2 + 5, max: playableAreaWidth / 2 - 5 };
                this.mesh.position.x = this.patrolRange.max;
                this.stepTimer = 0;
                this.impactTimer = Math.random() * 5 + 3;
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
                this.growlGain.gain.value = 0;
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
                gain.gain.value = baseVolume * vol * vol;
                source.connect(gain).connect(audioContext.destination);
                source.start();
            }

            update(deltaTime) {
                // Sleep Mode
                if (Math.abs(this.mesh.position.x - camera.position.x) > 35) return;

                if (!this.isAlive || !player) return;
                const distanceToPlayer = this.mesh.position.distanceTo(player.mesh.position);
                if (this.growlGain) {
                    const maxDist = 30;
                    let vol = 1 - (distanceToPlayer / maxDist);
                    if (vol < 0) vol = 0;
                    this.growlGain.gain.setTargetAtTime(vol * 1.0, audioContext.currentTime, 0.1);
                }
                this.stepTimer -= deltaTime;
                if (this.stepTimer <= 0) {
                    this.playScopedSound('enemy1_step', 0.7, 0.8, distanceToPlayer);
                    this.stepTimer = 1.2;
                }
                this.impactTimer -= deltaTime;
                if (this.impactTimer <= 0) {
                     this.playScopedSound('enemy1_impact', 1.0, 1.0, distanceToPlayer);
                     this.impactTimer = Math.random() * 6 + 4;
                }
                if (distanceToPlayer < this.detectionRange) {
                    this.state = 'PURSUE';
                } else {
                    this.state = 'PATROL';
                }
                let currentSpeed = this.patrolSpeed;
                if (this.state === 'PURSUE') {
                    currentSpeed = this.pursueSpeed;
                    this.direction = (player.mesh.position.x > this.mesh.position.x) ? 1 : -1;
                } else {
                    if (this.mesh.position.x <= this.patrolRange.min) {
                        this.direction = 1;
                    } else if (this.mesh.position.x >= this.patrolRange.max) {
                        this.direction = -1;
                    }
                }
                this.mesh.position.x += currentSpeed * this.direction;
                const isFacingLeft = (player.mesh.position.x < this.mesh.position.x);
                this.mesh.rotation.y = isFacingLeft ? Math.PI : 0;
                if (Date.now() - this.lastFrameTime > animationSpeed) {
                    this.lastFrameTime = Date.now();
                    this.currentFrame = (this.currentFrame + 1) % totalEnemyFrames;
                    this.texture.offset.x = this.currentFrame / totalEnemyFrames;
                }
            }

            takeHit() {
                if (!this.isAlive) return;
                this.hitCount++;
                if (this.hitCount >= 6) {
                    this.isAlive = false;
                    this.scene.remove(this.mesh);
                    this.stopAudio(1.5);

                    if (!window.firstKillHappened) {
                        window.firstKillHappened = true;
                        // Garantizar los 3 items
                        allPowerUps.push(new LootItem(this.scene, this.mesh.position.clone(), 'health'));
                        allPowerUps.push(new LootItem(this.scene, this.mesh.position.clone(), 'power'));
                        allPowerUps.push(new LootItem(this.scene, this.mesh.position.clone(), 'soul')); // Asumiendo 'soul' existe o usará default
                    } else if (Math.random() < 0.5) {
                        const dropPosition = this.mesh.position.clone();
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

        class EnemyX1 {
            constructor(scene, initialX) {
                this.scene = scene;
                // Textures with NearestFilter
                this.runTexture = textureLoader.load(assetUrls.enemyX1Run);
                this.runTexture.magFilter = THREE.NearestFilter;
                this.runTexture.minFilter = THREE.NearestFilter;

                this.attackTexture = textureLoader.load(assetUrls.enemyX1Attack);
                this.attackTexture.magFilter = THREE.NearestFilter;
                this.attackTexture.minFilter = THREE.NearestFilter;

                this.deathTexture = textureLoader.load(assetUrls.enemyX1Death);
                this.deathTexture.magFilter = THREE.NearestFilter;
                this.deathTexture.minFilter = THREE.NearestFilter;

                // Grid 8x2
                this.runTexture.repeat.set(0.125, 0.5);
                this.attackTexture.repeat.set(0.125, 0.5);
                this.deathTexture.repeat.set(0.125, 0.5);

                const enemyHeight = 5.6;
                const enemyWidth = 4.4;

                const enemyMaterial = new THREE.MeshStandardMaterial({
                    map: this.runTexture,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide
                });
                const enemyGeometry = new THREE.PlaneGeometry(enemyWidth, enemyHeight);
                this.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);

                // Scale Logic (Using Run texture as reference)
                const scale = getScaleFromPath(assetUrls.enemyX1Run);
                this.mesh.scale.set(scale, scale, 1);

                this.mesh.position.set(initialX, enemyHeight / 2, 0);
                this.mesh.castShadow = true;
                this.scene.add(this.mesh);

                this.maxHealth = 8;
                this.health = this.maxHealth;
                this.isAlive = true;
                this.isDying = false;

                this.state = 'PATROL';
                this.hasDetectedPlayer = false;
                this.detectionRange = 15.0;
                this.attackRange = 3.5;

                this.patrolSpeed = 0.03;
                this.pursueSpeed = 0.05;

                this.currentFrame = 0;
                this.lastFrameTime = 0;
                this.direction = -1;
                this.patrolRange = { min: initialX - 10, max: initialX + 10 };

                this.attackCooldown = 0;

                // Audio
                this.stepTimer = 0;
                this.growlSource = null;
                this.growlGain = null;
                this.startGrowl();
            }

            startGrowl() {
                if (!audioBuffers['enemy1_growl']) return;
                this.growlSource = audioContext.createBufferSource();
                this.growlSource.buffer = audioBuffers['enemy1_growl'];
                this.growlSource.loop = true;
                this.growlSource.playbackRate.value = 0.9 + Math.random() * 0.2;

                this.growlGain = audioContext.createGain();
                this.growlGain.gain.value = 0;
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
                             try { this.growlSource.stop(); } catch(e) {}
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
                // Usar función logarítmica con baseVolume
                const maxDist = 25;
                const vol = calculateLogVolume(distance, maxDist);
                gain.gain.value = baseVolume * vol;

                source.connect(gain).connect(audioContext.destination);
                source.start();
            }

            update(deltaTime) {
                // Optimization: Sleep if off-screen (and not already dead/static)
                if (this.isAlive && Math.abs(this.mesh.position.x - camera.position.x) > 35) return;

                if (!this.isAlive && !this.isDying) return;

                if (!player) return;

                // --- ANIMATION LOGIC (8 Columns) ---
                const updateAnimation = (totalFrames, texture, isDeath = false) => {
                    let loopFinished = false;
                    if (this.mesh.material.map !== texture) {
                        this.mesh.material.map = texture;
                    }

                    if (Date.now() - this.lastFrameTime > animationSpeed) {
                        this.lastFrameTime = Date.now();

                        if (isDeath) {
                            if (this.currentFrame < totalFrames - 1) {
                                this.currentFrame++; // 0 to 8
                            } else {
                                this.finalizeDeath();
                                return true;
                            }
                        } else {
                            this.currentFrame = (this.currentFrame + 1) % totalFrames;
                            if (this.currentFrame === 0) loopFinished = true;
                        }

                        let col = this.currentFrame % 8;
                        let rowY = (this.currentFrame < 8) ? 0.5 : 0.0;

                        texture.offset.set(col * 0.125, rowY);
                    }
                    return loopFinished;
                };

                // --- DEATH STATE ---
                if (this.isDying) {
                    updateAnimation(9, this.deathTexture, true);
                    return;
                }

                // Si está muerto (ya finalizado), no hacemos nada
                if (!this.isAlive) return;

                const distanceToPlayer = this.mesh.position.distanceTo(player.mesh.position);

                // --- AUDIO UPDATE ---
                if (this.growlGain) {
                    const maxDist = 25;
                    const vol = calculateLogVolume(distanceToPlayer, maxDist);
                    this.growlGain.gain.setTargetAtTime(vol, audioContext.currentTime, 0.1);
                }

                // --- ATTACK STATE ---
                if (this.state === 'ATTACK') {
                    const finished = updateAnimation(10, this.attackTexture);
                    if (finished) {
                        this.state = 'PURSUE';
                        this.attackCooldown = 1.0;
                    }
                    return;
                }

                if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;

                // --- AI LOGIC ---
                if (!this.hasDetectedPlayer) {
                    if (distanceToPlayer < this.detectionRange) {
                        this.hasDetectedPlayer = true;
                        this.state = 'PURSUE';
                    } else {
                        this.state = 'PATROL';
                    }
                } else {
                    this.state = 'PURSUE';
                }

                // Check Attack Trigger (Interrupt Move)
                if (this.state === 'PURSUE' && distanceToPlayer < this.attackRange && this.attackCooldown <= 0) {
                    this.state = 'ATTACK';
                    this.currentFrame = -1; // Reset anim
                    return;
                }

                // Movement
                let currentSpeed = this.patrolSpeed;
                if (this.state === 'PURSUE') {
                    currentSpeed = this.pursueSpeed;
                    this.direction = (player.mesh.position.x > this.mesh.position.x) ? 1 : -1;
                } else {
                    if (this.mesh.position.x <= this.patrolRange.min) this.direction = 1;
                    else if (this.mesh.position.x >= this.patrolRange.max) this.direction = -1;
                }

                this.mesh.position.x += currentSpeed * this.direction;
                const isMovingLeft = this.direction < 0;
                this.mesh.rotation.y = isMovingLeft ? Math.PI : 0;

                // Footsteps
                this.stepTimer -= deltaTime;
                if (this.stepTimer <= 0) {
                    this.playScopedSound('enemy1_step', 1.0, 1.0, distanceToPlayer);
                    this.stepTimer = 0.4;
                }

                updateAnimation(10, this.runTexture);
            }

            takeHit() {
                if (!this.isAlive || this.isDying) return;
                this.health--;

                const dist = player ? this.mesh.position.distanceTo(player.mesh.position) : 10;
                this.playScopedSound('enemy1_impact', 1.0, 1.0, dist);

                if (this.health <= 0) {
                    this.isAlive = false;
                    this.isDying = true;
                    this.currentFrame = -1;
                    this.stopAudio(0.5);
                }
            }

            finalizeDeath() {
                this.isDying = false;

                if (!window.firstKillHappened) {
                    window.firstKillHappened = true;
                    // Garantizar los 3 items: Vida, Energía y Alma
                    allPowerUps.push(new LootItem(this.scene, this.mesh.position.clone(), 'health'));
                    allPowerUps.push(new LootItem(this.scene, this.mesh.position.clone(), 'power'));
                    allPowerUps.push(new LootItem(this.scene, this.mesh.position.clone(), 'soul'));
                } else if (Math.random() < 0.6) {
                    const dropPosition = this.mesh.position.clone();
                    const type = Math.random() < 0.5 ? 'health' : 'power';
                    allPowerUps.push(new PowerUp(this.scene, dropPosition, type));
                }
                const index = allEnemiesX1.indexOf(this);
                if (index > -1) {
                    allEnemiesX1.splice(index, 1);
                }
            }
        }

        class DecorGhost {
            constructor(scene, x) {
                this.scene = scene;
                this.initialY = 3.5;
                this.texture = textureLoader.load(assetUrls.specterTexture);
                // NearestFilter
                this.texture.magFilter = THREE.NearestFilter;
                this.texture.minFilter = THREE.NearestFilter;
                this.texture.repeat.x = 1 / totalSpecterFrames;

                const material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });

                const geometry = new THREE.PlaneGeometry(4.2, 4.2);
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.set(x, this.initialY, 0);
                this.scene.add(this.mesh);

                this.currentFrame = 0;
                this.lastFrameTime = 0;

                // Wander AI Variables
                this.state = 'IDLE'; // 'IDLE' or 'MOVING'
                this.moveTargetX = x;
                this.waitTimer = Math.random() * 2 + 1; // Initial wait
                this.moveSpeed = 1.5; // Units per second
                this.startX = x;
                this.wanderRange = 15; // Move +/- 15 units

                this.voiceSource = null;
                this.voiceGain = null;
                this.startVoice();
            }

            startVoice() {
                if (!audioBuffers['fantasma_lamento']) return;
                this.voiceSource = audioContext.createBufferSource();
                this.voiceSource.buffer = audioBuffers['fantasma_lamento'];
                this.voiceSource.loop = true;
                this.voiceSource.playbackRate.value = 0.9;

                this.voiceGain = audioContext.createGain();
                this.voiceGain.gain.value = 0;
                this.voiceSource.connect(this.voiceGain).connect(audioContext.destination);
                this.voiceSource.start();
            }

            stopAudio(fadeOutDuration = 0) {
                if (this.voiceSource) {
                     try { this.voiceSource.stop(); } catch(e) {}
                     this.voiceSource = null;
                }
            }

            update(deltaTime) {
                // Optimization: Sleep if off-screen (skip update but keep alive)
                // Increased range to 60 to ensure it stays active/visible longer
                if (Math.abs(this.mesh.position.x - camera.position.x) > 60) return;

                // --- AI LOGIC (WANDER) ---
                if (this.state === 'IDLE') {
                    this.waitTimer -= deltaTime;
                    if (this.waitTimer <= 0) {
                        // Pick new target
                        const randomOffset = (Math.random() - 0.5) * 2 * this.wanderRange;
                        this.moveTargetX = this.startX + randomOffset;
                        // Clamp to level bounds roughly (-55 to 55)
                        this.moveTargetX = Math.max(-50, Math.min(50, this.moveTargetX));
                        this.state = 'MOVING';
                    }
                } else if (this.state === 'MOVING') {
                    const direction = this.moveTargetX > this.mesh.position.x ? 1 : -1;
                    const dist = Math.abs(this.moveTargetX - this.mesh.position.x);

                    if (dist < 0.2) {
                        // Arrived
                        this.state = 'IDLE';
                        this.waitTimer = Math.random() * 3 + 2; // Wait 2-5 seconds
                    } else {
                        // Move
                        this.mesh.position.x += direction * this.moveSpeed * deltaTime;
                        // Face Direction (Ghost logic: Face movement)
                        this.mesh.rotation.y = direction > 0 ? 0 : Math.PI;
                    }
                }

                // --- ANIMATION & BOBBING ---
                if (Date.now() - this.lastFrameTime > specterAnimationSpeed) {
                    this.lastFrameTime = Date.now();
                    this.currentFrame = (this.currentFrame + 1) % totalSpecterFrames;
                    this.texture.offset.x = this.currentFrame / totalSpecterFrames;
                }

                this.mesh.position.y = this.initialY + Math.sin(Date.now() * 0.002) * 0.5;

                if (player && this.voiceGain) {
                    const dist = this.mesh.position.distanceTo(player.mesh.position);
                    const maxDist = 20;
                    const vol = calculateLogVolume(dist, maxDist);
                    this.voiceGain.gain.setTargetAtTime(vol * 1.0, audioContext.currentTime, 0.1);
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

        class ImpactParticleSystem {
            constructor(scene, position) {
                this.scene = scene;
                this.life = 1.0;
                const particleCount = 25;

                const geometry = new THREE.BufferGeometry();
                const positions = [];
                const velocities = [];

                for (let i = 0; i < particleCount; i++) {
                    positions.push(position.x, position.y, position.z);

                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const speed = 2.0 + Math.random() * 3.0;

                    velocities.push({
                        x: Math.sin(phi) * Math.cos(theta) * speed,
                        y: Math.sin(phi) * Math.sin(theta) * speed,
                        z: Math.cos(phi) * speed
                    });
                }

                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

                const material = new THREE.PointsMaterial({
                    map: textureLoader.load(assetUrls.sparkParticle),
                    color: 0x00FFFF,
                    size: 0.3,
                    transparent: true,
                    opacity: 1.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });

                this.mesh = new THREE.Points(geometry, material);
                this.velocities = velocities;
                this.scene.add(this.mesh);
            }

            update(deltaTime) {
                this.life -= deltaTime;
                if (this.life <= 0) {
                    this.scene.remove(this.mesh);
                    return false;
                }

                const positions = this.mesh.geometry.attributes.position.array;
                const gravity = 5.0;

                for (let i = 0; i < this.velocities.length; i++) {
                    this.velocities[i].y -= gravity * deltaTime;
                    positions[i * 3] += this.velocities[i].x * deltaTime;
                    positions[i * 3 + 1] += this.velocities[i].y * deltaTime;
                    positions[i * 3 + 2] += this.velocities[i].z * deltaTime;
                }

                this.mesh.geometry.attributes.position.needsUpdate = true;
                this.mesh.material.opacity = this.life;
                return true;
            }
        }

        class TrailRenderer {
            constructor(scene, width, length, maxAlpha = 0.6) {
                this.scene = scene;
                this.width = width;
                this.length = length;
                this.history = [];
                this.maxAlpha = maxAlpha;

                this.geometry = new THREE.BufferGeometry();
                const maxVertices = length * 2;
                const positions = new Float32Array(maxVertices * 3);
                const colors = new Float32Array(maxVertices * 4);

                this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

                const indices = [];
                for (let i = 0; i < length - 1; i++) {
                    const v = i * 2;
                    indices.push(v, v + 1, v + 2);
                    indices.push(v + 1, v + 3, v + 2);
                }
                this.geometry.setIndex(indices);

                this.material = new THREE.MeshBasicMaterial({
                    vertexColors: true,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                this.mesh = new THREE.Mesh(this.geometry, this.material);
                this.mesh.frustumCulled = false;
                this.scene.add(this.mesh);
            }

            update(currentPos, angle) {
                this.history.unshift({ pos: currentPos.clone(), angle: angle });
                if (this.history.length > this.length) this.history.pop();

                if (this.history.length < 2) return;

                const positions = this.geometry.attributes.position.array;
                const colors = this.geometry.attributes.color.array;
                let vIdx = 0;
                let cIdx = 0;

                for (let i = 0; i < this.history.length; i++) {
                    const pt = this.history[i];
                    const pct = i / (this.history.length - 1); // 0 (Head) to 1 (Tail)
                    const nx = -Math.sin(pt.angle);
                    const ny = Math.cos(pt.angle);

                    // --- Tapering Logic ---
                    // Shape: Thin Head (0.2) -> Wide Middle (1.0) -> Thin Tail (0.0)
                    // Use sine wave for smooth expansion and contraction
                    const widthScale = 0.2 + 0.8 * Math.sin(pct * Math.PI);
                    const currentWidth = this.width * widthScale;

                    // Vertex 1 (Top/Left)
                    positions[vIdx++] = pt.pos.x + nx * currentWidth * 0.5;
                    positions[vIdx++] = pt.pos.y + ny * currentWidth * 0.5;
                    positions[vIdx++] = pt.pos.z;

                    // Vertex 2 (Bottom/Right)
                    positions[vIdx++] = pt.pos.x - nx * currentWidth * 0.5;
                    positions[vIdx++] = pt.pos.y - ny * currentWidth * 0.5;
                    positions[vIdx++] = pt.pos.z;

                    // --- Alpha Gradient & Color Mixing ---
                    // Alpha: Fade IN fast at head (0.0 -> 1.0), then Fade OUT to tail (1.0 -> 0.0)
                    let alpha = this.maxAlpha;
                    if (pct < 0.1) {
                         alpha *= (pct / 0.1); // Fade In
                    } else {
                         alpha *= (1.0 - pct); // Fade Out
                    }

                    // Color: Predominantly Cyan (R=0, G=1, B=1).
                    // Add White only at the very head/core (pct < 0.5)
                    const whiteAmt = Math.max(0, 0.5 - pct);
                    const r = whiteAmt * 0.5; // Reduced Red -> Mostly Cyan
                    const g = 1.0;
                    const b = 1.0;

                    colors[cIdx++] = r; colors[cIdx++] = g; colors[cIdx++] = b; colors[cIdx++] = alpha;
                    colors[cIdx++] = r; colors[cIdx++] = g; colors[cIdx++] = b; colors[cIdx++] = alpha;
                }

                this.geometry.setDrawRange(0, (this.history.length - 1) * 6);
                this.geometry.attributes.position.needsUpdate = true;
                this.geometry.attributes.color.needsUpdate = true;
            }

            dispose() {
                this.scene.remove(this.mesh);
                this.geometry.dispose();
                this.material.dispose();
            }
        }

        // Global variables for shared resources to improve performance
        let sharedElectricTexture = null;
        let sharedCoreMaterial = null;

        class Projectile {
            constructor(scene, startPosition, direction) {
                this.scene = scene;
                this.speed = 0.5;

                // CLONE texture to ensure unique UV offsets per projectile instance
                this.texture = textureLoader.load(assetUrls.projectileSprite).clone();
                this.texture.wrapS = THREE.RepeatWrapping;
                this.texture.wrapT = THREE.RepeatWrapping;
                this.texture.magFilter = THREE.NearestFilter;
                this.texture.minFilter = THREE.NearestFilter;

                this.cols = 4;
                this.rows = 2;
                this.texture.repeat.set(1 / this.cols, 1 / this.rows);

                // Ensure the cloned texture updates its matrix
                this.texture.needsUpdate = true;

                const material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    color: 0xffffff,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                const geometry = new THREE.PlaneGeometry(2.0, 2.0);

                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.copy(startPosition);
                this.mesh.renderOrder = 10;

                this.angle = Math.atan2(direction.y, direction.x);
                this.mesh.rotation.z = this.angle;

                this.velocity = new THREE.Vector3(direction.x, direction.y, 0).multiplyScalar(this.speed);

                this.scene.add(this.mesh);

                this.state = 'FLIGHT';
                this.frameTimer = 0;
                this.animationSpeed = 0.04;

                this.frames = {
                    FLIGHT: [2, 3, 4],
                    IMPACT: [5, 6, 7]
                };

                this.currentSeqIndex = 0;
                this.isDead = false;

        this.mesh.scale.set(1.5, 1.5, 1.0); // Fixed Scale 1.5
                this.updateFrameUVs(this.frames.FLIGHT[0]);

                // --- NEW ELEMENTS & VISUAL POLISH ---

                // 1. Plasma Core (Motor Interno)
                // Performance Optimization: Singleton Texture & Material
                if (!sharedElectricTexture) {
                    sharedElectricTexture = generateElectricTexture();
                }
                if (!sharedCoreMaterial) {
                    sharedCoreMaterial = new THREE.SpriteMaterial({
                        map: sharedElectricTexture,
                        color: 0x00FFFF,
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                }

                this.plasmaCore = new THREE.Sprite(sharedCoreMaterial);
                // Slightly smaller than main projectile
                this.plasmaCore.scale.set(0.8, 0.8, 1);
                this.scene.add(this.plasmaCore);

                // Offset Z: Core behind Sprite (Tightened to -0.01 to appear as one body)
                this.zOffset = -0.01;

                // 2. Trail (Improved)
                // Width 0.5 (Base), Length 12, MaxAlpha 0.6
                this.trail = new TrailRenderer(this.scene, 0.5, 12, 0.6);

                // 3. Sparks (Legacy optimization)
                this.sparks = [];
                this.sparkTexture = textureLoader.load(assetUrls.sparkParticle);
                this.sparkTimer = 0;

                // 4. Flash
                this.flashMesh = null;
            }

            updateFrameUVs(frameIndex) {
                const col = frameIndex % this.cols;
                const row = Math.floor(frameIndex / this.cols);
                const u = col / this.cols;
                const v = (this.rows - 1 - row) * 0.5;
                this.texture.offset.set(u, v);
            }

            createFlash() {
                const geo = new THREE.SphereGeometry(1, 16, 16);
                const mat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                this.flashMesh = new THREE.Mesh(geo, mat);
                this.flashMesh.position.copy(this.mesh.position);
                this.flashMesh.scale.set(0, 0, 0);
                this.scene.add(this.flashMesh);
            }

            updateFlash(deltaTime) {
                if (!this.flashMesh) return;
                const expansionSpeed = 20.0 * deltaTime;
                this.flashMesh.scale.addScalar(expansionSpeed);
                this.flashMesh.material.opacity -= 5.0 * deltaTime;
                if (this.flashMesh.material.opacity <= 0) {
                    this.scene.remove(this.flashMesh);
                    this.flashMesh = null;
                }
            }

            updateSparks(deltaTime) {
                for (let i = this.sparks.length - 1; i >= 0; i--) {
                    const s = this.sparks[i];
                    s.life -= deltaTime;
                    s.mesh.position.add(s.velocity);
                    s.mesh.material.opacity = s.life * 2.0;
                    if (s.life <= 0) {
                        this.scene.remove(s.mesh);
                        this.sparks.splice(i, 1);
                    }
                }

                if (this.state !== 'FLIGHT') return;

                if (this.sparks.length < 10) {
                    const dir = new THREE.Vector3(Math.cos(this.angle), Math.sin(this.angle), 0);
                    const spawnPos = this.mesh.position.clone().sub(dir.multiplyScalar(0.8));
                    spawnPos.x += (Math.random() - 0.5) * 0.2;
                    spawnPos.y += (Math.random() - 0.5) * 0.2;

                    const sparkMat = new THREE.SpriteMaterial({
                        map: this.sparkTexture,
                        color: 0x00FFFF,
                        transparent: true,
                        opacity: 1.0,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    const spark = new THREE.Sprite(sparkMat);
                    spark.position.copy(spawnPos);
                    spark.scale.set(0.3, 0.3, 1);
                    const drift = new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0);
                    this.scene.add(spark);
                    this.sparks.push({ mesh: spark, life: 0.4 + Math.random() * 0.2, velocity: drift });
                }
            }

            triggerImpact() {
                if (this.state === 'IMPACT') return;

                this.state = 'IMPACT';
                this.currentSeqIndex = 0;
                this.frameTimer = 0;
                this.updateFrameUVs(this.frames.IMPACT[0]);

                this.velocity.set(0, 0, 0);
                allFlames.push(new ImpactParticleSystem(this.scene, this.mesh.position));

                this.createFlash();

                playAudio('fireball_impact', false, 0.9 + Math.random() * 0.2);
            }

            update(deltaTime) {
                if (this.isDead) return false;

                // --- Update Visual Components ---
                // Plasma Core & Trail follow mesh but offset in Z
                if (this.plasmaCore) {
                     this.plasmaCore.position.copy(this.mesh.position);
                     this.plasmaCore.position.z += this.zOffset;
                     this.plasmaCore.material.rotation += 10.0 * deltaTime; // Spin!
                     this.plasmaCore.visible = (this.state !== 'IMPACT'); // Hide on impact
                }

                if (this.state === 'FLIGHT' || this.state === 'SPAWN') {
                    const trailPos = this.mesh.position.clone();
                    trailPos.z += this.zOffset;
                    this.trail.update(trailPos, this.angle);
                }
                this.updateSparks(deltaTime);
                this.updateFlash(deltaTime);

                this.mesh.lookAt(camera.position);
                this.mesh.rotation.z = this.angle;

                this.frameTimer += deltaTime;
                let frameToSet = -1;

                if (this.frameTimer > this.animationSpeed) {
                    this.frameTimer = 0;

                    if (this.state === 'FLIGHT') {
                        this.currentSeqIndex = (this.currentSeqIndex + 1) % this.frames.FLIGHT.length;
                        frameToSet = this.frames.FLIGHT[this.currentSeqIndex];
                    } else if (this.state === 'IMPACT') {
                        this.currentSeqIndex++;
                        if (this.currentSeqIndex >= this.frames.IMPACT.length) {
                            this.cleanup();
                            this.isDead = true;
                            return false;
                        } else {
                            frameToSet = this.frames.IMPACT[this.currentSeqIndex];
                        }
                    }

                    if (frameToSet !== -1) {
                        this.updateFrameUVs(frameToSet);
                    }
                }

                if (this.state !== 'IMPACT') {
                    this.mesh.position.add(this.velocity);

                    if (this.mesh.position.x < player.minPlayerX || this.mesh.position.x > player.maxPlayerX) {
                        this.triggerImpact();
                    }

                    for (const enemy of allSimpleEnemies) {
                        // Optimization: Skip collision check if enemy is far
                        if (Math.abs(enemy.mesh.position.x - player.mesh.position.x) > 40) continue;

                        if (this.mesh.position.distanceTo(enemy.mesh.position) < 2.5) {
                            enemy.takeHit();
                            this.triggerImpact();
                        }
                    }

                    for (const enemy of allEnemiesX1) {
                        // Optimization: Skip collision check if enemy is far
                        if (Math.abs(enemy.mesh.position.x - player.mesh.position.x) > 40) continue;

                        if (this.mesh.position.distanceTo(enemy.mesh.position) < 2.5) {
                            enemy.takeHit();
                            this.triggerImpact();
                        }
                    }
                }

                return true;
            }

            cleanup() {
                this.scene.remove(this.mesh);
                if (this.plasmaCore) this.scene.remove(this.plasmaCore);
                this.trail.dispose();
                this.sparks.forEach(s => this.scene.remove(s.mesh));
                this.sparks = [];
                if (this.flashMesh) this.scene.remove(this.flashMesh);
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

        class LootItem {
            constructor(scene, position, type) {
                this.scene = scene;
                this.type = type; // 'soul', 'health', 'power'

                let textureUrl;
                if (type === 'health') textureUrl = assetUrls.healthEssence;
                else if (type === 'power') textureUrl = assetUrls.energyEssence;
                else textureUrl = assetUrls.soulFragment;

                this.texture = textureLoader.load(textureUrl);
                this.texture.magFilter = THREE.NearestFilter;
                this.texture.minFilter = THREE.NearestFilter;

                // 6 cols, 2 rows
                this.cols = 6;
                this.rows = 2;
                this.totalFrames = 11;
                this.texture.repeat.set(1 / this.cols, 1 / this.rows);

                const material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                const geometry = new THREE.PlaneGeometry(1.5, 1.5);

                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.copy(position);
                this.scene.add(this.mesh);

                this.state = 'IDLE';
                this.bobOffset = Math.random() * Math.PI * 2;
                this.currentFrame = Math.floor(Math.random() * this.totalFrames);
                this.frameTimer = 0;

                // Physics for attraction
                this.noiseSeed = Math.random() * 100;
            }

            update(deltaTime) {
                // Sleep optimization
                if (Math.abs(this.mesh.position.x - camera.position.x) > 35) return true;

                // Animation
                this.frameTimer += deltaTime;
                if (this.frameTimer > 0.1) { // 10 FPS
                    this.frameTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % this.totalFrames;

                    const col = this.currentFrame % this.cols;
                    const row = Math.floor(this.currentFrame / this.cols);
                    // Row 0 is top (v=0.5), Row 1 is bottom (v=0)
                    this.texture.offset.x = col / this.cols;
                    this.texture.offset.y = (this.rows - 1 - row) * 0.5;
                }

                this.mesh.lookAt(camera.position);

                // Logic
                const distToPlayer = player ? this.mesh.position.distanceTo(player.mesh.position) : 999;
                // Explicitly check for "Reload" action (Absorbing)
                const isReloading = player && player.isAbsorbing;

                if (this.state === 'IDLE') {
                    // Bobbing
                    this.bobOffset += deltaTime * 2;
                    this.mesh.position.y += Math.sin(this.bobOffset) * 0.005;

                    // Trigger Attraction ONLY if input is held
                    if (isReloading && distToPlayer < 15) {
                        this.state = 'ATTRACTED';
                    }
                } else if (this.state === 'ATTRACTED') {
                    if (!isReloading) {
                        this.state = 'IDLE'; // Stop if button released
                    } else {
                        // Move to player (Chest Height)
                        const targetPos = player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
                        const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
                        const dist = direction.length();
                        direction.normalize();

                        // Speed increases as distance decreases
                        const speed = 5.0 + (15 - dist);

                        // Turbulence
                        this.noiseSeed += deltaTime * 5;
                        const perp = new THREE.Vector3(-direction.y, direction.x, 0); // Simple 2D perp
                        const noise = Math.sin(this.noiseSeed) * Math.min(dist * 0.5, 2.0); // Less noise when very close

                        this.mesh.position.add(direction.multiplyScalar(speed * deltaTime));
                        this.mesh.position.add(perp.multiplyScalar(noise * deltaTime));

                        if (dist < 1.0) {
                            this.collect();
                            return false; // Remove from array
                        }
                    }
                }
                return true;
            }

            collect() {
                this.scene.remove(this.mesh);
                const index = allPowerUps.indexOf(this);
                if (index > -1) allPowerUps.splice(index, 1);

                if (typeof HUDProjectile !== 'undefined') {
                    allProjectiles.push(new HUDProjectile(this.scene, this.mesh.position, this.type));
                } else {
                    if (this.type === 'health') player.restoreHealth(10);
                    if (this.type === 'power') player.restorePower(15);
                }
            }
        }

// Expose classes to global scope for testing/verification
window.LootItem = LootItem;
window.PowerUp = LootItem; // Alias for backward compatibility
