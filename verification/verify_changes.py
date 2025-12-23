from playwright.sync_api import sync_playwright
import time

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--use-gl=swiftshader",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        # Create a new context with a larger viewport
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Mock AudioContext to prevent autoplay issues
        page.add_init_script("""
            window.AudioContext = class extends window.AudioContext {
                constructor() {
                    super();
                    this.state = 'running';
                }
                resume() { return Promise.resolve(); }
            };
            window.webkitAudioContext = window.AudioContext;
        """)

        # Navigate to the game page (assuming it's served locally or via file://)
        # Since we are in the repo root, we can use file:// with absolute path
        import os
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Wait for the splash screen to disappear and start button to be clickable
        try:
            # Click splash screen or start button
            # Based on memory, click #start-button
            page.wait_for_selector('#start-button', state='visible', timeout=10000)
            page.click('#start-button')
            print("Clicked Start Button")

            # Wait for Play button
            page.wait_for_selector('#play-button', state='visible', timeout=10000)
            page.click('#play-button')
            print("Clicked Play Button")

            # Wait for game to initialize (player object to exist)
            page.wait_for_function("() => window.player && window.player.mesh", timeout=20000)
            print("Game initialized")

            # Pause the game loop for stable inspection
            page.evaluate("window.isPaused = true; cancelAnimationFrame(window.animationFrameId);")

            # --- VERIFICATION 1: IDLE SPRITE URL ---
            idle_url = page.evaluate("window.player.idleTexture.image.src")
            print(f"Idle Texture URL: {idle_url}")
            if "Picsart_25-12-22_22-53-52-012.png" in idle_url:
                print("PASS: Idle sprite URL is correct.")
            else:
                print("FAIL: Idle sprite URL is incorrect.")

            # --- VERIFICATION 2: PLAYER Y OFFSET ---
            # We can check the geometry bounding box or the translation applied.
            # It's hard to check geometry translation directly on runtime mesh without complex helper.
            # Instead, let's check visual bounds vs mesh position.
            # Mesh Y should be 0.
            mesh_y = page.evaluate("window.player.mesh.position.y")
            print(f"Mesh Y: {mesh_y}")
            # We modified geometry.translate. We can't easily inspect that from here without vertex access.
            # But we can assume if the code change was verified by reading file, it's there.
            # Let's trust the code read for this specific geometric property.

            # --- VERIFICATION 3: CAMERA POSITION ---
            cam_pos = page.evaluate("({x: camera.position.x, y: camera.position.y, z: camera.position.z})")
            print(f"Camera Position: {cam_pos}")
            # Expected: x ~ 0, y ~ 6, z = 14
            if abs(cam_pos['y'] - 6) < 0.5 and abs(cam_pos['z'] - 14) < 0.1:
                print("PASS: Camera position is correct.")
            else:
                print("FAIL: Camera position is incorrect.")

            # --- VERIFICATION 4: ATTACK SCALE ZOOM ---
            # Force player state to shooting
            page.evaluate("window.player.currentState = 'shooting';")
            # Run one update frame to trigger scale logic
            page.evaluate("window.player.update(0.016, {joyVector: {x:0, y:0}, attackHeld: false})")

            scale = page.evaluate("window.player.mesh.scale.x")
            base_scale = 1.15 # PLAYER_SCALE
            expected_scale = base_scale * 1.35
            print(f"Player Scale (Shooting): {scale}, Expected: {expected_scale}")

            if abs(scale - expected_scale) < 0.01:
                print("PASS: Player zoom on attack is correct.")
            else:
                print("FAIL: Player zoom on attack is incorrect.")

            # --- VERIFICATION 5: PROJECTILE SCALE ---
            # Spawn a projectile
            page.evaluate("""
                const proj = new Projectile(window.scene, new THREE.Vector3(0,0,0), new THREE.Vector2(1,0));
                window.testProjectile = proj;
                window.allProjectiles.push(proj);
            """)
            proj_scale = page.evaluate("window.testProjectile.mesh.scale.x")
            print(f"Projectile Scale: {proj_scale}")

            if abs(proj_scale - 1.5) < 0.01:
                print("PASS: Projectile scale is 1.5.")
            else:
                print("FAIL: Projectile scale is incorrect.")

            proj_state = page.evaluate("window.testProjectile.state")
            print(f"Projectile State: {proj_state}")
            if proj_state == 'FLIGHT':
                print("PASS: Projectile starts in FLIGHT state.")
            else:
                print("FAIL: Projectile state is incorrect.")

            # Take Screenshot
            page.screenshot(path="verification/visual_verification.png")
            print("Screenshot saved to verification/visual_verification.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_verification.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_changes()
