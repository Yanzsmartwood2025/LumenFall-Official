from playwright.sync_api import sync_playwright
import time
import os

def check_idle_properties():
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
        context = browser.new_context()
        page = context.new_page()

        # Load game directly
        game_path = "file://" + os.path.abspath("Lumenfall-juego/index.html")
        print(f"Loading {game_path}")
        page.goto(game_path)

        # Bypass Auth
        print("Injecting auth...")
        page.evaluate("""
            window.LumenfallAuth = {
                currentUser: { uid: 'test-user', displayName: 'Test User' },
                onAuthStateChanged: (cb) => cb({ uid: 'test-user', displayName: 'Test User' })
            };
        """)

        # Start game
        print("Starting game...")
        try:
            page.wait_for_selector('#start-button', state='visible', timeout=5000)
            page.click('#start-button')

            page.wait_for_selector('#play-button', state='visible', timeout=5000)
            # Need to wait for transition
            time.sleep(2)
            page.click('#play-button')

            # Wait for game to initialize
            print("Waiting for game loop...")
            time.sleep(3)

            # Verify properties
            print("Checking Player properties...")
            result = page.evaluate("""
                () => {
                    const p = window.player;
                    if (!p) return { error: "Player not found" };

                    return {
                        state: p.currentState,
                        scaleX: p.mesh.scale.x,
                        scaleY: p.mesh.scale.y,
                        repeatX: p.idleTexture.repeat.x,
                        scaleRef: 1.35 * 0.7 // What we expect (0.945)
                    };
                }
            """)

            print("Result:", result)

            if 'error' in result:
                print("FAILED: " + result['error'])
            else:
                expected_scale_x = 1.35 * 0.7
                scale_ok = abs(result['scaleX'] - expected_scale_x) < 0.001
                repeat_ok = abs(result['repeatX'] - 0.15) < 0.001

                print(f"Scale X: {result['scaleX']} (Expected ~{expected_scale_x}) -> {'OK' if scale_ok else 'FAIL'}")
                print(f"Repeat X: {result['repeatX']} (Expected 0.15) -> {'OK' if repeat_ok else 'FAIL'}")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")

        browser.close()

if __name__ == "__main__":
    check_idle_properties()
