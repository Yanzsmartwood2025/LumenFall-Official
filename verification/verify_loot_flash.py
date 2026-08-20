from playwright.sync_api import sync_playwright
import time
import os

def verify_loot_flash():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
        )
        page = browser.new_page()

        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Mock Auth
        page.add_init_script("""
            window.LumenfallAuth = {
                onAuthStateChanged: (cb) => cb({ uid: 'test', displayName: 'Test', photoURL: 'x' }),
                currentUser: { uid: 'test' },
                userData: { displayName: 'Test' }
            };
        """)

        # Start
        try:
            page.locator("#start-button").click()
            time.sleep(1)
            page.locator("#play-button").wait_for(state="visible", timeout=5000)
            page.locator("#play-button").click()
        except:
            print("Startup error")
            return

        time.sleep(2)
        print("Game started.")

        # Inject Logic
        page.evaluate("""
            window.isPaused = false;
            window.scene = window.player.mesh.parent;

            // 1. Force Attack/Absorb via Monkey Patch
            const origUpdate = player.update.bind(player);
            player.update = function(dt, controls) {
                controls.attackHeld = true; // FORCE ON
                origUpdate(dt, controls);
            };

            // 2. Spawn Loot
            player.mesh.position.set(0, 0.8, 0);
            window.spawnLoot(null, new THREE.Vector3(9.0, 2.0, 0), 'health');

            // Find Mesh
            const children = window.scene.children;
            window.testLootMesh = null;
            for (let i = children.length - 1; i >= 0; i--) {
                const obj = children[i];
                if (obj.position.x === 9.0) {
                     window.testLootMesh = obj;
                     break;
                }
            }
        """)

        # Check attraction
        print("Moving player to Range 8.0 (x=2.0)...")
        page.evaluate("player.mesh.position.x = 2.0;")

        # Monitor
        print("Waiting for attraction...")
        moved = False
        for i in range(20):
            x = page.evaluate("window.testLootMesh ? window.testLootMesh.position.x : 999")
            if x < 8.0:
                print(f"Loot moving! X={x:.2f}")
                moved = True
                break
            time.sleep(0.1)

        if not moved:
            print("ERROR: Loot failed to attract.")
        else:
            print("SUCCESS: Loot attracted.")

        # Visual Flash Proof
        print("Setting up visual proof...")
        page.evaluate("""
            player.triggerImpactFlash('health');
            player.flashTimer = 5.0; // Force 5 seconds for screenshot
        """)
        time.sleep(0.2)
        page.screenshot(path="/app/verification/flash_proof.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_loot_flash()
