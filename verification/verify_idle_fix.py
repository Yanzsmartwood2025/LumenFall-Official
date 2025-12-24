from playwright.sync_api import sync_playwright
import os

def check_idle_fix():
    with sync_playwright() as p:
        # Launch browser with required args for WebGL
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        page = browser.new_page()

        # Load the game using file protocol
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Inject mock Auth to bypass login
        page.add_init_script("""
            window.LumenfallAuth = {
                currentUser: { uid: 'test-user', displayName: 'Tester', email: 'test@example.com' },
                userData: { gameCode: '123456' },
                onAuthStateChanged: (cb) => cb({ uid: 'test-user' })
            };
        """)

        # Click start button to init game (handling opacity transition)
        try:
            # Wait for start button
            page.wait_for_selector('#start-button', state='visible')
            page.click('#start-button')

            # Wait for play button (menu transition)
            page.wait_for_selector('#play-button', state='visible', timeout=5000)
            page.click('#play-button')

            # Wait for game to initialize (player created)
            page.wait_for_function("() => window.player && window.player.mesh")

            # Wait a bit for update loop to run and apply 'idle' state logic
            page.wait_for_timeout(2000)

            # Evaluate the texture repeat property on the player
            # We access window.player.idleTexture directly as verified in code
            data = page.evaluate("""
                () => {
                    if (!window.player) return null;
                    const tex = window.player.idleTexture;
                    if (!tex) return { error: "No idleTexture" };

                    // Force a few updates to ensure logic runs
                    // But checking static props should be enough if frame loop is running

                    return {
                        repeatX: tex.repeat.x,
                        repeatY: tex.repeat.y,
                        offsetX: tex.offset.x,
                        magFilter: tex.magFilter,
                        nearestFilterConst: 1003 // THREE.NearestFilter
                    };
                }
            """)

            print(f"Data Retrieved: {data}")

            # Assertions for the Fix
            expected_repeat = 0.18
            if abs(data['repeatX'] - expected_repeat) > 0.001:
                print(f"FAIL: Expected repeat.x ~0.18, got {data['repeatX']}")
            else:
                print(f"SUCCESS: repeat.x is {data['repeatX']}")

            if data['magFilter'] != 1003:
                print(f"FAIL: Expected NearestFilter (1003), got {data['magFilter']}")
            else:
                print("SUCCESS: NearestFilter is active.")

            # Take screenshot for visual confirmation
            page.screenshot(path="verification/verify_idle_fix.png")
            print("Screenshot saved to verification/verify_idle_fix.png")

        except Exception as e:
            print(f"Error during verification: {e}")

        finally:
            browser.close()

if __name__ == "__main__":
    check_idle_fix()
