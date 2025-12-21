from playwright.sync_api import sync_playwright
import time

def verify_game_fixes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Mock Auth to bypass redirect
        # We intercept the request to auth-core.js and return a mock implementation
        def handle_auth_route(route):
            mock_js = """
            window.LumenfallAuth = {
                onStateChanged: (callback) => {
                    console.log("Mock Auth: User logged in");
                    callback({ displayName: "Test Pilot", email: "test@example.com", photoURL: "assets/ui/barra-de-energia.png" }, {});
                },
                currentUser: { displayName: "Test Pilot" }
            };
            """
            route.fulfill(status=200, content_type="application/javascript", body=mock_js)

        page.route("**/auth-core.js", handle_auth_route)

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Loading game...")
        try:
            page.goto("http://localhost:8080/Lumenfall-juego/index.html")
        except Exception as e:
            print(f"Load Error (might be benign if handled): {e}")

        # 1. Click Start (Splash)
        try:
            print("Clicking Start Button...")
            # Wait for button to be visible/enabled
            page.wait_for_selector("#start-button", state="visible", timeout=10000)
            page.click("#start-button")
        except Exception as e:
            print(f"Error clicking start: {e}")
            page.screenshot(path="verification/error_start.png")
            return

        time.sleep(1)

        # 2. Click Play (Menu)
        try:
            print("Clicking Play Button...")
            page.wait_for_selector("#play-button", state="visible", timeout=10000)
            page.click("#play-button")
        except Exception as e:
            print(f"Error clicking play: {e}")
            page.screenshot(path="verification/error_play.png")
            return

        print("Waiting for game load...")
        time.sleep(5) # Wait for assets and scene init

        # 3. Verify Projectile (Shoot)
        print("Testing Projectile (Shoot)...")
        # Ensure btn-shoot exists
        if page.is_visible("#btn-shoot"):
            page.evaluate("document.getElementById('btn-shoot').dispatchEvent(new MouseEvent('mousedown'))")
            time.sleep(0.5)

            # Check if a projectile exists in the scene
            projectile_count = page.evaluate("window.allProjectiles ? window.allProjectiles.length : 0")
            print(f"Projectiles count: {projectile_count}")

            # Verify Projectile Type (Should be using Cylinder now)
            if projectile_count > 0:
                is_cylinder = page.evaluate("""
                    window.allProjectiles[0].mesh.children.some(c => c.geometry.type === 'CylinderGeometry') ||
                    (window.allProjectiles[0].cylinder && window.allProjectiles[0].cylinder.geometry.type === 'CylinderGeometry')
                """)
                print(f"Is Projectile Cylinder? {is_cylinder}")
                if is_cylinder:
                    print("SUCCESS: Projectile is a Cylinder.")
                else:
                    print("FAILURE: Projectile is NOT a Cylinder.")
            else:
                print("FAILURE: No projectile spawned.")

            page.screenshot(path="verification/vfx_projectile_fix.png")
        else:
            print("FAILURE: Shoot button not visible.")

        # 4. Verify Aura (Charge)
        print("Testing Aura (Charge)...")
        if page.is_visible("#btn-attack"):
            # Simulate holding the attack button
            page.evaluate("document.getElementById('btn-attack').dispatchEvent(new MouseEvent('mousedown'))")
            time.sleep(1.0) # Hold for 1 sec

            # Check Aura visibility and properties
            # Note: `player` is a global variable in game.js usually, but let's check access
            aura_info = page.evaluate("""
                (() => {
                    if (!window.player) return { error: "No player" };
                    if (!window.player.auraGroup) return { error: "No auraGroup" };
                    return {
                        visible: window.player.auraGroup.visible,
                        mainHeight: window.player.mainCylinder ? window.player.mainCylinder.geometry.parameters.height : 0,
                        baseHeight: window.player.baseCylinder ? window.player.baseCylinder.geometry.parameters.height : 0,
                        isShader: window.player.mainCylinder.material.type === 'ShaderMaterial'
                    };
                })()
            """)

            print(f"Aura Info: {aura_info}")

            if aura_info.get('visible') and aura_info.get('mainHeight') > 6.0 and aura_info.get('isShader'):
                 print("SUCCESS: Aura active, resized, and using Shader.")
            else:
                 print(f"FAILURE: Aura check failed. {aura_info}")

            page.screenshot(path="verification/vfx_aura_fix.png")

            # Release button
            page.evaluate("document.getElementById('btn-attack').dispatchEvent(new MouseEvent('mouseup'))")
        else:
            print("FAILURE: Attack button not visible.")

        browser.close()

if __name__ == "__main__":
    verify_game_fixes()
