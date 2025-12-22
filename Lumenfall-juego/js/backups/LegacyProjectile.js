class Projectile {
            constructor(scene, startPosition, direction) {
                this.scene = scene;
                this.speed = 0.5;

                this.texture = textureLoader.load(assetUrls.projectileSprite);
                this.texture.wrapS = THREE.RepeatWrapping;
                this.texture.wrapT = THREE.RepeatWrapping;
                this.texture.magFilter = THREE.NearestFilter;
                this.texture.minFilter = THREE.NearestFilter;

                this.cols = 4;
                this.rows = 2;
                this.texture.repeat.set(1 / this.cols, 1 / this.rows);

                const material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    color: 0x00aaff,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                const geometry = new THREE.CylinderGeometry(0.2, 0.2, 1.0, 8, 1, true);

                this.mesh = new THREE.Group();
                this.mesh.position.copy(startPosition);

                this.cylinder = new THREE.Mesh(geometry, material);
                this.cylinder.rotation.z = -Math.PI / 2;

                this.mesh.add(this.cylinder);
                this.mesh.frustumCulled = false;

                const angle = Math.atan2(direction.y, direction.x);
                this.mesh.rotation.z = angle;

                this.velocity = new THREE.Vector3(direction.x, direction.y, 0).multiplyScalar(this.speed);

                this.targetScale = 2.0;
                this.mesh.scale.set(0.1, 0.1, 0.1);

                this.scene.add(this.mesh);

                this.state = 'SPAWN';
                this.frameTimer = 0;
                this.animationSpeed = 0.08;

                this.frames = {
                    SPAWN: [0, 1, 2],
                    FLIGHT: [3, 4],
                    IMPACT: [5, 6, 7]
                };

                this.currentSeqIndex = 0;
                this.isDead = false;

                this.updateFrameUVs(this.frames.SPAWN[0]);
            }

            updateFrameUVs(frameIndex) {
                const col = frameIndex % this.cols;
                const row = Math.floor(frameIndex / this.cols);
                const u = col / this.cols;
                const v = (this.rows - 1 - row) / this.rows;
                this.texture.offset.set(u, v);
            }

            triggerImpact() {
                if (this.state === 'IMPACT') return;

                this.state = 'IMPACT';
                this.currentSeqIndex = 0;
                this.frameTimer = 0;
                this.updateFrameUVs(this.frames.IMPACT[0]);

                this.velocity.set(0, 0, 0);

                allFlames.push(new ImpactParticleSystem(this.scene, this.mesh.position));
                playAudio('fireball_impact', false, 0.9 + Math.random() * 0.2);
            }

            update(deltaTime) {
                if (this.isDead) return false;

                this.frameTimer += deltaTime;
                if (this.frameTimer > this.animationSpeed) {
                    this.frameTimer = 0;

                    if (this.state === 'SPAWN') {
                        this.currentSeqIndex++;
                        if (this.currentSeqIndex >= this.frames.SPAWN.length) {
                            this.state = 'FLIGHT';
                            this.currentSeqIndex = 0;
                            this.updateFrameUVs(this.frames.FLIGHT[0]);
                            this.mesh.scale.set(this.targetScale, this.targetScale, this.targetScale);
                        } else {
                            this.updateFrameUVs(this.frames.SPAWN[this.currentSeqIndex]);
                        }
                    }
                    else if (this.state === 'FLIGHT') {
                         this.currentSeqIndex = (this.currentSeqIndex + 1) % this.frames.FLIGHT.length;
                         this.updateFrameUVs(this.frames.FLIGHT[this.currentSeqIndex]);
                    }
                    else if (this.state === 'IMPACT') {
                         this.currentSeqIndex++;
                         if (this.currentSeqIndex >= this.frames.IMPACT.length) {
                             this.scene.remove(this.mesh);
                             this.isDead = true;
                             return false;
                         } else {
                             this.updateFrameUVs(this.frames.IMPACT[this.currentSeqIndex]);
                         }
                    }
                }

                if (this.state === 'SPAWN') {
                    const growthSpeed = 10.0 * deltaTime;
                    this.mesh.scale.addScalar(growthSpeed);
                    if (this.mesh.scale.x > this.targetScale) this.mesh.scale.setScalar(this.targetScale);
                    this.mesh.position.add(this.velocity);
                }

                if (this.state === 'FLIGHT') {
                    this.cylinder.rotation.y += 15.0 * deltaTime;
                    this.mesh.position.add(this.velocity);

                     if (this.mesh.position.x < player.minPlayerX || this.mesh.position.x > player.maxPlayerX) {
                        this.triggerImpact();
                        return true;
                    }

                    for (const enemy of allSimpleEnemies) {
                        if (this.mesh.position.distanceTo(enemy.mesh.position) < (enemy.mesh.geometry.parameters.height / 2)) {
                            enemy.takeHit();
                            this.triggerImpact();
                            return true;
                        }
                    }

                    for (const enemy of allEnemiesX1) {
                        if (this.mesh.position.distanceTo(enemy.mesh.position) < 2.5) {
                            enemy.takeHit();
                            this.triggerImpact();
                            return true;
                        }
                    }
                }

                return true;
            }
        }
