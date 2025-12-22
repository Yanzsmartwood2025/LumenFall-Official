from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        # Launch with specific args for WebGL
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        # Create context without autoplay permission (memory says it causes failures)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720}
        )

        # Mock Auth to bypass login
        context.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                window.LumenfallAuth = {
                    onAuthStateChanged: (cb) => {
                        // Simulate delay
                        setTimeout(() => {
                            cb({
                                uid: 'test-user',
                                displayName: 'Test User',
                                photoURL: 'assets/ui/icon.png',
                                email: 'test@example.com'
                            });
                        }, 100);
                        return () => {};
                    },
                    currentUser: { uid: 'test-user' }
                };
            """
        ))

        page = context.new_page()

        # Load local file
        file_path = os.path.abspath("Lumenfall-juego/index.html")
        page.goto(f"file://{file_path}")
        print("Page loaded.")

        # Handle Start Screen
        start_btn = page.locator("#start-button")
        if start_btn.is_visible():
            start_btn.click()
            print("Start button clicked.")

        # Handle Menu Play Button
        # Wait for menu screen to be visible
        page.wait_for_selector("#menu-screen", state="visible")

        # Click Play
        play_btn = page.locator("#play-button")
        play_btn.click()
        print("Play button clicked.")

        # Wait for game initialization
        # Check if player exists in window object (game exposes it)
        # Or wait for canvas
        page.wait_for_selector("#bg-canvas", state="visible")
        time.sleep(3) # Wait for fade out and level load

        # 1. Capture Idle State
        print("Capturing Idle Right...")
        page.screenshot(path="verification/verify_idle_right.png")

        # 2. Capture Attack Left State
        print("Capturing Attack Left...")
        # Inject JS to force state
        # Note: we need to ensure player is available.
        page.evaluate("""
            if (window.player) {
                window.player.mesh.position.set(0, 4.2/2, 0); // Reset pos
                window.player.isFacingLeft = true;
                // Trigger shoot manually to enter state
                // Need to mock joyVector in shoot call
                window.player.shoot({x: -1, y: 0});
            }
        """)

        # Wait a bit for animation frame to advance to a visible frame
        # Projectile anim speed is 0.04s, but player animation speed is 40ms per frame for attack
        time.sleep(0.1)

        page.screenshot(path="verification/verify_attack_left.png")
        print("Screenshots saved.")

        browser.close()

if __name__ == "__main__":
    run()
