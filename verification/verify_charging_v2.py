from playwright.sync_api import sync_playwright
import time
import os

def check_charging_logic():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        cwd = os.getcwd()
        url = f"file://{cwd}/Lumenfall-juego/index.html"
        print(f"Navigating to: {url}")

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

        try:
            page.wait_for_selector('#start-button', state='visible', timeout=10000)
            page.click('#start-button')

            page.wait_for_selector('#play-button', state='visible', timeout=10000)
            page.click('#play-button')

            time.sleep(2)

            print("Testing Charging Logic...")

            # --- TEST 1: Charging Start -> Loop ---
            # Dispatch events to trigger logic correctly
            print("Dispatching mousedown on Attack Button...")
            # We need to ensure we are not in gamepad mode (default is touch/mouse)
            page.dispatch_event('#btn-attack', 'mousedown')

            # Wait 600ms (Start=400ms approx + buffer)
            time.sleep(0.6)

            state_data = page.evaluate("""() => {
                return {
                    state: window.player.currentState,
                    chargePhase: window.player.chargingState,
                    frame: window.player.currentChargeFrame,
                    suctionVisible: window.player.suctionPoints.visible,
                    isLoop: window.player.chargingState === 'loop'
                }
            }""")

            print(f"State after hold: {state_data}")

            if state_data['state'] == 'charging' and state_data['chargePhase'] == 'loop':
                print("PASS: Charging Loop activated.")
            else:
                print("FAIL: Charging Loop not activated correctly.")

            # --- TEST 2: Release (End Phase) ---
            print("Dispatching mouseup on Attack Button...")
            page.dispatch_event('#btn-attack', 'mouseup')

            time.sleep(0.1) # Immediate frame after release

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

            # Capture visual of Loop Phase again for screenshot
            # Reset
            time.sleep(1) # Let end phase finish
            page.dispatch_event('#btn-attack', 'mousedown')
            time.sleep(0.6)

            page.screenshot(path="verification/charging_loop_v2.png")
            print("Screenshot saved: verification/charging_loop_v2.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_state_v2.png")

        browser.close()

if __name__ == "__main__":
    check_charging_logic()
