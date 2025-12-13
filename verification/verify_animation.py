from playwright.sync_api import sync_playwright, Page, expect
import time

def verify_animation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # No permissions arg
        context = browser.new_context()
        page = context.new_page()

        # Navigate
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for start button and click
        page.wait_for_selector("#start-button")
        page.click("#start-button")

        # Wait for game to load (canvas visible)
        page.wait_for_selector("#bg-canvas", state="visible")

        # Wait a bit for transition (intro screen fades out)
        time.sleep(2)

        # Ensure we are in menu and click Play
        # Check if play-button is visible, if so click it
        if page.is_visible("#play-button"):
            page.click("#play-button")
            # Wait for game start transition
            time.sleep(2)

        print("--- Verifying IDLE State ---")
        try:
            # Check Scale in Idle
            idle_scale_x = page.evaluate("try { player.mesh.scale.x } catch(e) { 'undefined' }")
            print(f"Idle Scale X: {idle_scale_x}")

            if idle_scale_x == 'undefined':
                 print("FATAL: Cannot access 'player'.")
                 return

            if abs(float(idle_scale_x) - 1.15) > 0.01:
                print("FAILURE: Idle scale is not 1.15")
            else:
                print("SUCCESS: Idle scale is 1.15")

        except Exception as e:
            print(f"Error accessing player: {e}")

        page.screenshot(path="verification/idle_state.png")

        print("\n--- Simulating RUNNING State ---")
        # Simulate Running by setting joyVector directly
        try:
            page.evaluate("joyVector.x = 1.0;")
            print("Set joyVector.x = 1.0")
        except Exception as e:
            print(f"Error setting joyVector: {e}")
            return

        time.sleep(1) # Run for 1 second

        try:
            # Check Scale in Running
            running_scale_x = page.evaluate("player.mesh.scale.x")
            print(f"Running Scale X: {running_scale_x}")

            if abs(float(running_scale_x) - 1.0) > 0.01:
                print("FAILURE: Running scale is not 1.0")
            else:
                print("SUCCESS: Running scale is 1.0")

            # Check frame loop
            print("Sampling frames...")
            frames = []
            for _ in range(20): # Sample more frames
                frame = page.evaluate("player.currentFrame")
                frames.append(frame)
                time.sleep(0.05)
            print(f"Running Frames sampled: {frames}")

            # We expect frames to be in range [2, 6]

            invalid_frames = [f for f in frames if f < 2]
            if invalid_frames:
                 print(f"FAILURE: Found frames < 2 during loop: {invalid_frames}")
            else:
                 print("SUCCESS: All sampled frames in loop are >= 2")

        except Exception as e:
            print(f"Error during running verification: {e}")

        page.screenshot(path="verification/running_state.png")

        # Stop running
        page.evaluate("joyVector.x = 0.0;")

        browser.close()

if __name__ == "__main__":
    verify_animation()
