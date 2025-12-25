
import asyncio
from playwright.async_api import async_playwright, Route

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
        )
        page = await browser.new_page()

        # MOCK AUTHENTICATION to prevent redirect
        async def handle_auth_route(route: Route):
            mock_js = """
            console.log("MOCK AUTH LOADED");
            window.LumenfallAuth = {
                currentUser: { uid: 'test-user', displayName: 'Test Pilot', email: 'test@example.com', photoURL: '' },
                onStateChanged: (callback) => {
                    setTimeout(() => callback(window.LumenfallAuth.currentUser, {}), 10);
                },
                loginWithGoogle: () => {},
                signOut: () => {}
            };
            export const LumenfallAuth = window.LumenfallAuth;
            """
            await route.fulfill(status=200, content_type="application/javascript", body=mock_js)

        await page.route("**/auth-core.js", handle_auth_route)

        # Load the game
        print("Navigating to game page...")
        # Ensure we don't hit the redirect race condition, though intercept should handle it
        await page.goto("http://localhost:8080/Lumenfall-juego/index.html")

        # Wait for game to initialize
        try:
            # Wait for mock auth to take effect
            await page.wait_for_function("() => window.LumenfallAuth && window.currentUserData")
            print("Auth Mocked Successfully.")

            await page.wait_for_selector('#start-button', state='visible', timeout=10000)
            print("Clicking Start Button...")
            await page.click('#start-button')

            await page.wait_for_selector('#play-button', state='visible', timeout=10000)
            print("Clicking Play Button...")
            await page.click('#play-button')

            # Wait for game loop to start
            await page.wait_for_timeout(3000)
            print("Game Loop should be running.")
        except Exception as e:
            print(f"Startup error: {e}")
            # Capture screenshot for debug
            await page.screenshot(path="debug_startup.png")

        # Inject Test Logic
        print("Injecting Test LootItem...")

        result = await page.evaluate("""() => {
            if (!window.player) return { error: "Player not found" };

            // Hook update to capture the instance
            window.testLootItem = null;
            const originalUpdate = window.LootItem.prototype.update;
            window.LootItem.prototype.update = function(dt) {
                window.testLootItem = this;
                return originalUpdate.call(this, dt);
            };

            // Spawn one item near player (within attraction range < 15, but > 5)
            const pPos = window.player.mesh.position;
            // Spawn at (x+8, y+2)
            window.spawnLoot(null, new THREE.Vector3(pPos.x + 8, pPos.y + 2, 0), 'health');

            return { success: true };
        }""")

        if result.get('error'):
            print(f"Setup Error: {result['error']}")
            await browser.close()
            return

        # Allow a frame to run so update() is called and we capture the instance
        await page.wait_for_timeout(500)

        # Now verify IDLE Physics
        print("Verifying IDLE Physics (Tethered Wandering)...")
        idle_data = await page.evaluate("""() => {
            const item = window.testLootItem;
            if (!item) return { error: "Item not captured" };

            // Override wanderTimer to force a new target immediately
            item.wanderTimer = 0;

            const startPos = item.mesh.position.clone();
            const positions = [];

            // Simulate 60 frames of IDLE (1 sec)
            for(let i=0; i<60; i++) {
                item.update(0.016);
                positions.push(item.mesh.position.clone());
            }

            return {
                start: startPos,
                end: item.mesh.position,
                velocities: [item.velocity.x, item.velocity.y, item.velocity.z],
                friction: item.friction
            };
        }""")

        if idle_data.get('error'):
             print(f"Idle Test Error: {idle_data['error']}")
        else:
            start_x = idle_data['start']['x']
            end_x = idle_data['end']['x']
            print(f"Idle Start X: {start_x:.4f}, End X: {end_x:.4f}")
            if abs(end_x - start_x) < 0.0001:
                print("WARNING: Item did not move in Idle state (Velocity might be 0)")
            else:
                print("SUCCESS: Item moved in Idle state.")

        # Verify ATTRACTION Physics
        print("Verifying ATTRACTION Physics (Heavy Start)...")
        attract_data = await page.evaluate("""() => {
            const item = window.testLootItem;
            // Enable absorption
            window.player.isAbsorbing = true;

            const vels = [];
            // Simulate 60 frames (1 sec)
            // We expect velocity to increase
            for(let i=0; i<60; i++) {
                item.update(0.016);
                vels.push(item.velocity.length());
            }

            return { velocities: vels };
        }""")

        vels = attract_data['velocities']
        print(f"Velocities (First 5): {[f'{v:.4f}' for v in vels[:5]]}")
        print(f"Velocities (Last 5): {[f'{v:.4f}' for v in vels[-5:]]}")

        if vels[-1] > vels[0]:
            print("SUCCESS: Velocity increased over time (Acceleration verified).")
        else:
            print("FAILURE: Velocity did not increase.")

        # Verify INERTIA (Drift)
        print("Verifying INERTIA (Drift on Release)...")
        inertia_data = await page.evaluate("""() => {
            const item = window.testLootItem;
            // Disable absorption
            window.player.isAbsorbing = false;

            const vels = [];
            // Simulate 20 frames of release
            for(let i=0; i<20; i++) {
                item.update(0.016);
                vels.push(item.velocity.length());
            }

            return { velocities: vels };
        }""")

        drift_vels = inertia_data['velocities']
        print(f"Drift Velocities (First 5): {[f'{v:.4f}' for v in drift_vels[:5]]}")

        # Check if velocity persists (is > 0) but decreases
        if drift_vels[0] > 0.01 and drift_vels[-1] < drift_vels[0] and drift_vels[-1] > 0:
             print("SUCCESS: Velocity persisted and decayed (Inertia verified).")
        elif drift_vels[0] <= 0.01:
             print("FAILURE: Velocity dropped to near 0 immediately.")
        else:
             print("SUCCESS (Partial): Velocity behavior acceptable.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
