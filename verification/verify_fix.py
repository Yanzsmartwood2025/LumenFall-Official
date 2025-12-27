from playwright.sync_api import sync_playwright
import time
import os

def verify_fix():
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

        # Start Game
        page.locator("#start-button").click()
        try:
            page.locator("#play-button").wait_for(state="visible", timeout=5000)
            page.locator("#play-button").click()
        except:
            print("Start failed")
            return

        time.sleep(2)

        # Inject Test Scenario
        page.evaluate("""
            window.isPaused = false;
            window.player.mesh.position.set(0, 0.8, 0);

            // Wait for allPowerUps
            if (!window.allPowerUps) window.allPowerUps = [];

            // Spawn Loot FAR AWAY so it doesn't collect instantly
            window.spawnLoot(null, new THREE.Vector3(5.0, 2.0, 0), 'health');

            // Hook LootItem
            window.testLoot = window.allPowerUps[window.allPowerUps.length - 1];

            if (window.testLoot) {
                window.testLoot.isCollectedObserved = false;

                // Override collect
                const origCollect = window.testLoot.collect.bind(window.testLoot);
                window.testLoot.collect = function() {
                    window.testLoot.isCollectedObserved = true;
                    origCollect();
                };
            }
        """)

        print("Loot spawned at 5.0. Moving player close...")

        # Move player close to trigger hard capture (< 0.8 distance)
        # Loot is at 5.0. Player at 0.0.
        # Move player to 4.5. Dist = 0.5.
        page.evaluate("player.mesh.position.x = 4.5;")

        # Run loop
        success = False
        for i in range(20):
            # Force update
            page.evaluate("player.update(0.016, { joyVector: {x:0, y:0}, attackHeld: true })")
            time.sleep(0.05)

            # Check state
            status = page.evaluate("""() => {
                if (!window.testLoot) return { exists: false, scale: 0, isCollected: false };
                const l = window.testLoot;
                const exists = window.allPowerUps.includes(l);
                const scale = l.mesh.scale.x;
                return { exists, scale, isCollected: l.isCollectedObserved };
            }""")

            print(f"Frame {i}: Exists={status['exists']}, Scale={status['scale']:.2f}, CollectedCalled={status['isCollected']}")

            if status['isCollected'] and status['exists'] and status['scale'] < 1.0:
                print("SUCCESS: Item persists and is shrinking.")
                success = True
                break

        if not success:
            print("FAILURE: Item did not animate correctly.")

        browser.close()

if __name__ == "__main__":
    verify_fix()
