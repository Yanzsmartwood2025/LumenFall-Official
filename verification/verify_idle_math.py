from playwright.sync_api import sync_playwright
import time

def verify_idle_logic():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gl-drawing-for-tests",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Load the game page (file protocol)
        page.goto("file:///app/Lumenfall-juego/index.html")

        # Inject mock auth
        page.evaluate("""
            window.LumenfallAuth = {
                onAuthStateChanged: (cb) => {
                   cb({ uid: 'test-user', displayName: 'Test User', photoURL: 'test.jpg' });
                   return () => {};
                },
                currentUser: { uid: 'test-user' }
            };
        """)

        # Wait for initialization
        time.sleep(2)

        # Start game logic
        page.evaluate("if(window.startGame) window.startGame();")
        time.sleep(2) # Wait for fade and load

        # Inject verification logic to check Player sprite properties
        result = page.evaluate("""
            () => {
                if (!window.player) return "No Player";
                const p = window.player;

                // Set state to idle manually to be sure
                p.currentState = 'idle';
                p.isFacingLeft = false;
                p.update(0.1, { joyVector: {x:0, y:0}, attackHeld: false }); // Force one update

                return {
                    textureRepeatX: p.idleTexture.repeat.x,
                    textureRepeatY: p.idleTexture.repeat.y,
                    frames: []
                };
            }
        """)

        print(f"Initial State: {result}")

        # We can't easily capture the visual loop without OCR/CV, but we can verify logic params
        # Check if 1/6 is approx 0.16666

        expected_repeat_x = 1/6
        actual_repeat_x = result['textureRepeatX']

        if abs(actual_repeat_x - expected_repeat_x) < 0.001:
            print("SUCCESS: Texture repeat X is correct (1/6)")
        else:
            print(f"FAILURE: Texture repeat X is {actual_repeat_x}, expected {expected_repeat_x}")

        # Capture a screenshot just to be safe, though static screenshot of idle is hard to judge for animation
        page.screenshot(path="verification/verify_idle_math.png")

        browser.close()

if __name__ == "__main__":
    verify_idle_logic()
