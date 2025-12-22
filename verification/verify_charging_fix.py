from playwright.sync_api import sync_playwright

def test_charging_logic():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gl-drawing-for-tests",
                "--mute-audio",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context()
        # Mock auth to bypass login
        context.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="window.LumenfallAuth = { currentUser: { uid: 'test', displayName: 'TestUser' }, onAuthStateChanged: (cb) => cb({ uid: 'test' }) };"
        ))

        page = context.new_page()
        # Using file protocol
        import os
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Wait for game initialization
        try:
            # Click Start Button (Splash) if visible
            if page.is_visible("#start-button"):
                page.click("#start-button")

            # Wait for menu (Play button visible)
            page.wait_for_selector("#play-button", state="visible", timeout=10000)

            # Click Play Button to start game and create Player instance
            page.click("#play-button")

            # Wait a bit for startGame async/animations
            page.wait_for_timeout(2000)

            # Verify uThreshold
            # Access window.player.chargingMaterial.uniforms.uThreshold.value
            threshold = page.evaluate("window.player && window.player.chargingMaterial ? window.player.chargingMaterial.uniforms.uThreshold.value : null")

            print(f"Detected uThreshold: {threshold}")
            if threshold == 0.60:
                print("SUCCESS: Threshold is 0.60")
            else:
                print(f"FAILURE: Expected uThreshold 0.60, but got {threshold}")
                exit(1)

        except Exception as e:
            print(f"Error during verification: {e}")
            exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    test_charging_logic()
