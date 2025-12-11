from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile-like viewport since the user is on mobile
        context = browser.new_context(viewport={'width': 800, 'height': 360}, user_agent='Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36')
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        print("Navigating to game...")
        page.goto("http://localhost:8000/index.html")

        # Wait for start button
        print("Waiting for Start button...")
        try:
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")
        except Exception as e:
            print(f"Error finding start button: {e}")
            page.screenshot(path="verification/error_start.png")
            browser.close()
            return

        # Wait for menu (intro transition)
        print("Waiting for Play button...")
        try:
            # Intro transition takes some time
            page.wait_for_selector("#play-button", state="visible", timeout=10000)

            # Click Play
            page.click("#play-button")
        except Exception as e:
            print(f"Error finding play button: {e}")
            page.screenshot(path="verification/error_play.png")
            browser.close()
            return

        # Wait for game to load (canvas visible)
        print("Waiting for game canvas...")
        try:
            page.wait_for_selector("#bg-canvas", state="visible", timeout=10000)
        except Exception as e:
            print(f"Error finding canvas: {e}")
            page.screenshot(path="verification/error_canvas.png")
            browser.close()
            return

        # Wait a bit for game loop to start
        time.sleep(3)

        # Verify MAPS.room_5 modification via evaluation
        room_5_statues = page.evaluate("() => typeof MAPS !== 'undefined' && MAPS.room_5.statues")
        print(f"MAPS.room_5.statues: {room_5_statues}")

        if room_5_statues is None:
            print("VERIFICATION SUCCESS: MAPS.room_5.statues is undefined/null as expected.")
        else:
            print(f"VERIFICATION FAILURE: MAPS.room_5.statues exists: {room_5_statues}")

        # Check for shared materials existence
        shared_flame = page.evaluate("() => typeof sharedFlameMaterial !== 'undefined' && sharedFlameMaterial !== null ? 'exists' : 'undefined'")
        print(f"sharedFlameMaterial: {shared_flame}")

        shared_proj = page.evaluate("() => typeof sharedProjectileMaterial !== 'undefined' ? 'exists' : 'undefined'") # Note: might be null until first projectile
        print(f"sharedProjectileMaterial (var exists): {shared_proj}")

        # Screenshot
        page.screenshot(path="verification/gameplay.png")
        print("Screenshot saved to verification/gameplay.png")

        browser.close()

if __name__ == "__main__":
    run()
