from playwright.sync_api import sync_playwright
import time
import os

def check_loot_logic(page):
    print("Setting up routes...")

    # Mock auth-core.js to bypass Firebase and Auth checks
    page.route("**/auth-core.js", lambda route: route.fulfill(
        status=200,
        content_type="application/javascript",
        body="""
            console.log("🔥 MOCKED AUTH CORE LOADED");
            window.LumenfallAuth = {
                currentUser: { uid: 'mock-user', displayName: 'Mock Pilot' },
                userData: { role: 'tester' },
                onStateChanged: (cb) => {
                    console.log("🔥 MOCKED onStateChanged CALLED");
                    // Immediately fire with a user
                    setTimeout(() => cb({ uid: 'mock-user', displayName: 'Mock Pilot' }, { role: 'tester' }), 10);
                },
                loginWithGoogle: () => {},
                signOut: () => {}
            };
        """
    ))

    print("Loading game...")
    # Load index.html directly
    page.goto(f"file://{os.getcwd()}/Lumenfall-juego/index.html")

    # Wait for game to be ready (start button visible)
    try:
        page.wait_for_selector("#start-button", state="visible", timeout=10000)
        print("Start button visible.")
    except:
        print("Start button not found immediately.")

    # Click start button to init audio context and show main menu
    if page.is_visible("#start-button"):
        print("Clicking Start Button...")
        page.click("#start-button")
        time.sleep(1)

    # Click Play button to start game
    print("Clicking Play Button...")
    try:
        page.wait_for_selector("#play-button", state="visible", timeout=10000)
        # Ensure it's clickable
        page.click("#play-button", force=True)
        print("Play button clicked.")
    except Exception as e:
        print(f"Play button issue: {e}")

    # Wait for game initialization (scene creation)
    print("Waiting for scene initialization...")
    time.sleep(3)

    print("Verifying LootItem class and spawnLoot function...")
    # Check if classes exist
    is_defined = page.evaluate("""
        typeof LootItem !== 'undefined' && typeof spawnLoot !== 'undefined'
    """)
    if not is_defined:
        print("ERROR: Classes LootItem or function spawnLoot NOT defined in global scope.")
        return

    print("Classes defined. Spawning LootItem manually...")

    # Spawn a LootItem
    page.evaluate("""
        if (window.scene) {
            window.testLoot = new LootItem(window.scene, new THREE.Vector3(5, 2, 0), 'soul');
            window.allPowerUps.push(window.testLoot);
            console.log("Test Loot Spawned");
        } else {
            console.error("window.scene is undefined");
        }
    """)

    # Verify it exists in allPowerUps
    count = page.evaluate("window.allPowerUps.length")
    print(f"Loot count: {count}")
    if count == 0:
        print("ERROR: LootItem not added to allPowerUps.")
        return

    # Test Absorption Logic
    print("Testing Absorption Logic...")
    initial_x = page.evaluate("window.testLoot.mesh.position.x")

    # Simulate Player Absorbing
    page.evaluate("""
        if (window.player) {
            window.player.isAbsorbing = true;
            window.player.mesh.position.set(0, 0.8, 0); // Player at 0
            window.testLoot.mesh.position.set(5, 2, 0); // Loot at 5
        }
    """)

    # Advance time (simulate frame updates)
    print("Simulating updates...")
    for _ in range(30):
        page.evaluate("""
            window.testLoot.update(0.016);
        """)

    final_x = page.evaluate("window.testLoot.mesh.position.x")
    print(f"Initial X: {initial_x}, Final X: {final_x}")

    if final_x < initial_x:
        print("SUCCESS: LootItem moved towards player.")
    else:
        print("FAILURE: LootItem did not move towards player.")

    # Check UI Elements
    print("Checking for Spectral Bar...")
    has_bar = page.evaluate("document.getElementById('spectral-bar') !== null")
    if has_bar:
        print("SUCCESS: Spectral Bar found in DOM.")
    else:
        print("FAILURE: Spectral Bar NOT found.")

    # Take screenshot of the scene
    print("Taking screenshot...")
    page.screenshot(path="verification/loot_verification_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-web-security",
                "--allow-file-access-from-files",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        # Override console to print to python stdout
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            check_loot_logic(page)
        except Exception as e:
            print(f"Exception during verification: {e}")
        finally:
            browser.close()
