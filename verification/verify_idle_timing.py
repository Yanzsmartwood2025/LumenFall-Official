
import os
import sys
from playwright.sync_api import sync_playwright
import time

# Mock auth to bypass login
MOCK_AUTH_SCRIPT = """
window.LumenfallAuth = {
    onStateChanged: (callback) => {
        // Immediately invoke callback with mock user
        callback({ displayName: 'Test User', email: 'test@example.com', photoURL: '' }, {});
    },
    currentUser: { displayName: 'Test User' }
};
"""

def verify_idle_timing():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
        )
        context = browser.new_context()
        page = context.new_page()

        # Inject mock auth before load
        page.add_init_script(MOCK_AUTH_SCRIPT)

        # Load local file
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Wait for player to be exposed
        print("Waiting for game to initialize...")
        # Since we click "Empezar" then "Jugar", we need to automate that
        # 1. Click Start Button
        start_btn = page.locator("#start-button")
        start_btn.wait_for(state="visible", timeout=10000)
        start_btn.click()

        # 2. Click Play Button (Menu)
        play_btn = page.locator("#play-button")
        play_btn.wait_for(state="visible", timeout=10000)
        # Wait for transition
        time.sleep(1.5)
        play_btn.click()

        # 3. Wait for player object
        page.wait_for_function("window.player !== undefined")
        print("Player object found.")

        # 4. Verify Idle State and Frames
        # Force idle state just in case
        page.evaluate("window.player.currentState = 'idle'")

        # Monitor frames
        print("Monitoring animation frames...")

        # We need to wait for frame 0 to appear, then measure how long it stays.
        # This loop polls frame index and timestamp.

        script = """
        () => {
            return {
                frame: window.player.currentFrame,
                time: Date.now()
            }
        }
        """

        last_frame = -1
        frame_start_time = 0
        frame_0_duration = 0
        frame_1_duration = 0

        # Monitor for 10 seconds or until we capture data
        start_monitor = time.time()
        while time.time() - start_monitor < 15:
            data = page.evaluate(script)
            current_frame = data['frame']
            now = time.time() * 1000 # ms

            if current_frame != last_frame:
                if last_frame == 0:
                    frame_0_duration = now - frame_start_time
                    print(f"Frame 0 duration: {frame_0_duration}ms")
                elif last_frame == 1:
                    frame_1_duration = now - frame_start_time
                    print(f"Frame 1 duration: {frame_1_duration}ms")

                last_frame = current_frame
                frame_start_time = now

            if frame_0_duration > 0 and frame_1_duration > 0:
                break

            time.sleep(0.05) # Poll every 50ms

        # Assertions
        # Frame 0 should be approx 3000ms. Allow margin.
        if frame_0_duration > 2500 and frame_0_duration < 3500:
            print("PASS: Frame 0 duration is within acceptable range (approx 3s).")
        else:
            print(f"FAIL: Frame 0 duration {frame_0_duration}ms is not close to 3000ms.")
            sys.exit(1)

        # Frame 1 should be approx 200ms.
        if frame_1_duration > 150 and frame_1_duration < 400: # allow some lag overhead
             print("PASS: Frame 1 duration is within acceptable range (approx 200ms).")
        else:
             print(f"FAIL: Frame 1 duration {frame_1_duration}ms is not close to 200ms.")
             sys.exit(1)

        browser.close()

if __name__ == "__main__":
    verify_idle_timing()
