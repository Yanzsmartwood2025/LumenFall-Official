from playwright.sync_api import sync_playwright
import time
import os

def check_charging_logic():
    with sync_playwright() as p:
        # Use specific args for this environment (WebGL support)
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        # Create context without granting permissions explicitly if it causes issues,
        # but usually we need audio. However, memory says "do not explicitly grant autoplay".
        context = browser.new_context()

        # Route audio files to avoid 404s if missing or just to silence them
        # We only care about logic here.

        page = context.new_page()

        # Determine absolute path to index.html
        cwd = os.getcwd()
        url = f"file://{cwd}/Lumenfall-juego/index.html"
        print(f"Navigating to: {url}")

        # Intercept Auth to bypass login
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                window.LumenfallAuth = {
                    onStateChanged: (cb) => cb({ uid: 'test-user', email: 'test@example.com' }, { displayName: 'Test User' }),
                    currentUser: { uid: 'test-user' }
                };
            """
        ))

        page.goto(url)

        # Wait for game load (Start Button)
        try:
            page.wait_for_selector('#start-button', state='visible', timeout=10000)
            print("Start button found.")
            page.click('#start-button')

            # Wait for Menu Play Button
            page.wait_for_selector('#play-button', state='visible', timeout=10000)
            print("Play button found.")
            page.click('#play-button')

            # Wait for game initialization
            time.sleep(2)

            # Verify Player Exists
            player_exists = page.evaluate("!!window.player")
            print(f"Player object exists: {player_exists}")

            if not player_exists:
                print("FATAL: Player not found.")
                return

            # --- TEST 1: Charging State Logic ---
            print("Testing Charging Logic...")

            # Simulate holding attack button
            # We can manually set the flag in the game loop via evaluate since we can't easily hold a key in headless for N frames reliably without logic support
            # But the game checks `isAttackButtonPressed`. We can inject that.

            page.evaluate("window.isAttackButtonPressed = true; window.attackPressStartTime = Date.now();")

            # Wait 500ms (Charging Start -> Loop)
            # Start (0-3 @ 100ms) = 400ms. So after 500ms it should be in Loop.
            time.sleep(0.6)

            # Check State
            state_data = page.evaluate("""() => {
                return {
                    state: window.player.currentState,
                    chargePhase: window.player.chargingState,
                    frame: window.player.currentChargeFrame,
                    suctionVisible: window.player.suctionPoints.visible
                }
            }""")

            print(f"State after hold: {state_data}")

            if state_data['state'] == 'charging' and state_data['chargePhase'] == 'loop':
                print("PASS: Charging Loop activated.")
            else:
                print("FAIL: Charging Loop not activated correctly.")

            # --- TEST 2: Release Button (End Phase) ---
            print("Releasing Button...")
            page.evaluate("window.isAttackButtonPressed = false;")

            # Wait 100ms (Should be in End Phase)
            time.sleep(0.1)

            state_data_end = page.evaluate("""() => {
                return {
                    state: window.player.currentState,
                    chargePhase: window.player.chargingState,
                    frame: window.player.currentChargeFrame
                }
            }""")

            print(f"State after release: {state_data_end}")

            if state_data_end['chargePhase'] == 'end':
                print("PASS: Entered End Phase.")
            else:
                print("FAIL: Did not enter End Phase.")

            # Take screenshot of the "End" phase or "Loop" phase
            # Let's try to capture the visual.
            # Reset and hold again to capture Loop
            page.evaluate("window.isAttackButtonPressed = true; window.attackPressStartTime = Date.now();")
            time.sleep(0.6)
            page.screenshot(path="verification/charging_loop.png")
            print("Screenshot saved: verification/charging_loop.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_state.png")

        browser.close()

if __name__ == "__main__":
    check_charging_logic()
