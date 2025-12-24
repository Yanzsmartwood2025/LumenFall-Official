from playwright.sync_api import sync_playwright, expect
import time

def verify_player_scale():
    with sync_playwright() as p:
        # Launch browser with args for WebGL support
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-gl=swiftshader",
                "--enable-webgl",
                "--enable-unsafe-swiftshader",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )
        # Create context with permissions
        context = browser.new_context()
        page = context.new_page()

        # Handle console logs to debug
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        # Intercept auth-core.js to force authentication logic
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                console.log('⚡ MOCK AUTH CORE LOADED');
                window.LumenfallAuth = {
                    currentUser: {
                        uid: 'test-user-123',
                        displayName: 'Test User',
                        email: 'test@example.com',
                        photoURL: 'https://via.placeholder.com/150'
                    },
                    onAuthStateChanged: (cb) => {
                        console.log('⚡ MOCK onAuthStateChanged TRIGGERED');
                        cb(window.LumenfallAuth.currentUser);
                        return () => {};
                    },
                    signInWithEmailLink: () => Promise.resolve(),
                    signOut: () => Promise.resolve()
                };
            """
        ))

        # Navigate to game
        url = "http://localhost:8080/Lumenfall-juego/index.html"
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for Start Button (Intro Screen)
        print("Waiting for #start-button...")
        try:
            # Check if we were redirected to root
            if "index.html" not in page.url:
                print(f"Redirected to: {page.url}")

            page.wait_for_selector("#start-button", state="visible", timeout=10000)
            print("Clicking Start Button...")
            # Use JS click to avoid 'element not visible' issues if overlay
            page.evaluate("document.getElementById('start-button').click()")
        except Exception as e:
            print(f"Start button not found or error: {e}")

        # Wait for Play Button (Menu Screen)
        print("Waiting for #play-button...")
        try:
            page.wait_for_selector("#play-button", state="visible", timeout=10000)
            time.sleep(1) # Let transition finish
            print("Clicking Play Button...")
            page.evaluate("document.getElementById('play-button').click()")
        except Exception as e:
            print(f"Play button error: {e}")

        # Wait for Game Load (window.player defined)
        print("Waiting for window.player...")
        page.wait_for_function("() => window.player !== undefined", timeout=20000)

        # Allow assets to load
        time.sleep(3)

        # Helper to get scale
        def get_scale():
            return page.evaluate("""
                () => {
                    const s = window.player.mesh.scale;
                    return { x: s.x, y: s.y, z: s.z, state: window.player.currentState };
                }
            """)

        # 1. Check IDLE
        scale_idle = get_scale()
        print(f"IDLE Scale: {scale_idle}")
        page.screenshot(path="verification/player_idle.png")

        # 2. Force Landing
        print("Forcing LANDING state...")
        page.evaluate("""
            window.player.currentState = 'landing';
            window.player.currentFrame = -1; // Reset frame
            window.player.velocity.y = 0;
            window.player.isGrounded = true;
        """)

        # Wait a few frames for update to run
        time.sleep(0.5)

        scale_landing = get_scale()
        print(f"LANDING Scale: {scale_landing}")
        page.screenshot(path="verification/player_landing.png")

        # 3. Force Attack
        print("Forcing SHOOTING state...")
        page.evaluate("""
            window.player.currentState = 'shooting';
            window.player.currentFrame = -1;
        """)
        time.sleep(0.5)
        scale_shooting = get_scale()
        print(f"SHOOTING Scale: {scale_shooting}")

        # Verify Formula: x should be roughly y * ratio
        # We can't know exact ratio without image analysis, but we check y is 1.35
        expected_height = 1.35

        if abs(scale_idle['y'] - expected_height) < 0.01:
            print("SUCCESS: IDLE Height is correct (1.35)")
        else:
            print(f"FAILURE: IDLE Height is {scale_idle['y']}")

        if abs(scale_landing['y'] - expected_height) < 0.01:
            print("SUCCESS: LANDING Height is correct (1.35)")
        else:
             print(f"FAILURE: LANDING Height is {scale_landing['y']}")

        browser.close()

if __name__ == "__main__":
    verify_player_scale()
