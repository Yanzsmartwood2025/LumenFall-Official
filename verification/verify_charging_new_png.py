from playwright.sync_api import sync_playwright, expect
import time

def verify_charging_visuals():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            bypass_csp=True
        )

        page = context.new_page()

        # MOCK AUTHENTICATION to prevent redirect
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                window.LumenfallAuth = {
                    currentUser: { uid: 'test-user', displayName: 'Test', photoURL: 'test.png' },
                    userData: { role: 'player' },
                    onAuthStateChanged: (cb) => {
                         // Execute callback immediately to simulate logged in state
                         setTimeout(() => cb({ uid: 'test-user', displayName: 'Test' }), 0);
                         return () => {};
                    },
                    signOut: () => Promise.resolve()
                };
                // Pre-populate global if game uses it directly before auth init
                window.currentUserData = { displayName: 'Test', photoURL: 'test.png' };
            """
        ))

        # Block other external scripts if necessary to speed up
        # page.route("**/*analytics*", lambda route: route.abort())

        # Navigate to local server
        page.goto("http://localhost:8080/Lumenfall-juego/index.html")

        # Wait for Splash Screen
        print("Waiting for Splash Screen...")
        page.wait_for_selector('#start-button', state='visible', timeout=10000)

        # Click Start Button
        print("Clicking Start Button...")
        page.click('#start-button')

        # Wait for Play Button (Menu)
        print("Waiting for Play Button...")
        page.wait_for_selector('#play-button', state='visible')
        time.sleep(1) # transition

        # Click Play
        print("Clicking Play...")
        page.click('#play-button')

        # Wait for Game Canvas
        print("Waiting for Game Canvas...")
        page.wait_for_selector('#bg-canvas', state='visible')

        # Wait for Player to be instantiated
        print("Waiting for player instantiation...")
        page.wait_for_function("() => window.player && window.player.mesh")

        # Wait a bit for initial animations (intro)
        time.sleep(2)

        print("Triggering Charge State...")
        # Inject state: Attack Held via Event Dispatch
        page.evaluate("""() => {
            window.isPaused = false;
            const btn = document.getElementById('btn-attack');
            const event = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            btn.dispatchEvent(event);
        }""")

        # Wait for state transition
        time.sleep(1.0)

        # Verify State
        state = page.evaluate("() => window.player.currentState")
        print(f"Current State: {state}")

        # Verify Material Type
        material_type = page.evaluate("() => window.player.mesh.material.type")
        print(f"Material Type: {material_type}")

        if state != 'charging':
            print("ERROR: Player did not enter charging state.")

        if material_type != 'MeshBasicMaterial':
             print(f"ERROR: Material is not MeshBasicMaterial. Found: {material_type}")

        # Take Screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/verify_charging_new_png.png")

        # Release button
        page.evaluate("""() => {
             const btn = document.getElementById('btn-attack');
             const event = new MouseEvent('mouseup', { bubbles: true });
             btn.dispatchEvent(event);
        }""")

        browser.close()

if __name__ == "__main__":
    verify_charging_visuals()
