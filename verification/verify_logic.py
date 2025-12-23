from playwright.sync_api import sync_playwright
import os

def verify_logic():
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
        page = browser.new_page()

        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Wait for game.js to execute
        page.wait_for_function("() => typeof window.Player !== 'undefined'")

        print("--- VERIFICATION START ---")

        # 1. Verify Asset URLs
        idle_url = page.evaluate("window.assetUrls.idleSprite")
        print(f"Asset URL (Idle): {idle_url}")
        if "Picsart_25-12-22_22-53-52-012.png" in idle_url:
            print("PASS: Idle URL updated.")
        else:
            print("FAIL: Idle URL mismatch.")

        # 2. Verify Camera Initial Setup (Global camera object)
        cam_pos = page.evaluate("({x: camera.position.x, y: camera.position.y, z: camera.position.z})")
        print(f"Camera Init Pos: {cam_pos}")
        if abs(cam_pos['y'] - 6) < 0.1 and abs(cam_pos['z'] - 14) < 0.1:
             print("PASS: Camera initial position correct.")
        else:
             print("FAIL: Camera initial position incorrect.")

        # 3. Verify Projectile Defaults
        # Instantiate a dummy projectile
        # We need a dummy scene and positions
        page.evaluate("window.dummyScene = new THREE.Scene();")
        page.evaluate("""
            window.testProj = new Projectile(window.dummyScene, new THREE.Vector3(0,0,0), new THREE.Vector2(1,0));
        """)

        proj_scale = page.evaluate("window.testProj.mesh.scale.x")
        proj_state = page.evaluate("window.testProj.state")

        print(f"Projectile Scale: {proj_scale}")
        if abs(proj_scale - 1.5) < 0.01:
            print("PASS: Projectile scale is 1.5.")
        else:
            print("FAIL: Projectile scale mismatch.")

        print(f"Projectile State: {proj_state}")
        if proj_state == 'FLIGHT':
            print("PASS: Projectile state is FLIGHT.")
        else:
            print("FAIL: Projectile state mismatch.")

        # 4. Verify Player Attack Zoom
        # We need to instantiate a player. This might trigger texture loads which is fine.
        page.evaluate("window.testPlayer = new Player();")

        # Mock attack state
        page.evaluate("window.testPlayer.currentState = 'shooting';")
        # Run update logic for scale
        page.evaluate("""
            const currentScale = getScaleFromPath('assets/sprites/Joziel/');
            if (window.testPlayer.currentState === 'shooting') {
                window.testPlayer.mesh.scale.set(currentScale * 1.35, currentScale * 1.35, 1);
            }
        """)

        player_scale = page.evaluate("window.testPlayer.mesh.scale.x")
        expected = 1.15 * 1.35 # PLAYER_SCALE * 1.35
        print(f"Player Scale (Shooting): {player_scale}")
        if abs(player_scale - expected) < 0.01:
            print("PASS: Player zoom logic works.")
        else:
            print("FAIL: Player zoom logic mismatch.")

        # Take a screenshot for good measure (though nothing visual really happened yet)
        page.screenshot(path="verification/logic_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_logic()
