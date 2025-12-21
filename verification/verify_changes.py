from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Console logging
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        # Intercept auth-core.js to mock authentication
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                console.log("🔥 MOCKED AUTH CORE LOADED");
                window.LumenfallAuth = {
                    onStateChanged: (cb) => {
                        console.log("🔥 MOCKED AUTH STATE CHANGE TRIGGERED");
                        // Return a fake user to prevent redirect and allow game to start
                        cb({
                            displayName: 'TEST_PILOT',
                            email: 'test@lumenfall.com',
                            photoURL: 'assets/ui/barra-de-energia.png'
                        }, {});
                    }
                };
            """
        ))

        try:
            # Load the game
            page.goto("http://localhost:8080/Lumenfall-juego/index.html", timeout=10000)

            # Wait for game to initialize (canvas visible)
            page.wait_for_selector("canvas#bg-canvas")
            page.wait_for_timeout(2000)

            print("Checking assetUrls...")
            # Check variable in global scope (not window property for const)
            blue_fire_url = page.evaluate("assetUrls.blueFire")
            print(f"assetUrls.blueFire: {blue_fire_url}")

            if 'fuego-antorcha.jpg' in blue_fire_url:
                print("✅ assetUrls.blueFire verified.")
            else:
                print("❌ assetUrls.blueFire check FAILED.")

            print("Checking AmbientTorchFlame class...")
            is_mesh_present = page.evaluate("""() => {
                try {
                    // Try to instantiate
                    if (typeof AmbientTorchFlame === 'function' && typeof scene !== 'undefined') {
                        const tempFlame = new AmbientTorchFlame(scene, {x:0, y:0, z:0});
                        const isMesh = tempFlame.mesh instanceof THREE.Mesh;
                        const color = tempFlame.mesh.material.color.getHexString();
                        return { isMesh, color };
                    }
                    return { error: 'Class or Scene not found' };
                } catch(e) {
                    return { error: e.toString() };
                }
            }""")

            print(f"AmbientTorchFlame Check: {is_mesh_present}")

            if isinstance(is_mesh_present, dict) and is_mesh_present.get('isMesh') and is_mesh_present.get('color') == '00aaff':
                 print("✅ AmbientTorchFlame verified (Mesh + Blue Color).")
            else:
                 print("❌ AmbientTorchFlame check FAILED.")

            # Check First Flame Event Function
            print("Checking triggerFirstFlameEvent...")
            has_event_func = page.evaluate("typeof triggerFirstFlameEvent === 'function'")
            if has_event_func:
                 print("✅ triggerFirstFlameEvent exists.")
            else:
                 print("❌ triggerFirstFlameEvent MISSING.")

            # Take screenshot
            page.screenshot(path="verification/game_screen.png")
            print("Screenshot saved to verification/game_screen.png")

            # Use frontend_verification_complete tool to mark as done
            # But I am running this manually via python.
            # I will just close.

        except Exception as e:
            print(f"TEST FAILED: {e}")
            page.screenshot(path="verification/error_state.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
