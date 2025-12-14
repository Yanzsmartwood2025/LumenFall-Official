
from playwright.sync_api import sync_playwright
import time
import sys

def verify_left_jump(page):
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

    print("Navigating to game...")
    page.goto("http://localhost:8000/Lumenfall-juego/")

    print("Waiting for start button...")
    page.wait_for_selector("#start-button", timeout=10000)
    page.click("#start-button")

    # Wait for Play button (Menu) - The start button goes to Intro, then Menu
    print("Waiting for Play button...")
    page.wait_for_selector("#play-button", state="visible", timeout=20000)
    page.click("#play-button")

    print("Waiting for game to start (Player init)...")
    page.wait_for_function("() => window.player !== undefined", timeout=20000)

    print("Player initialized. Waiting a bit for stability...")
    time.sleep(2)

    joystick = page.locator("#joystick-container")
    box = joystick.bounding_box()
    if not box:
        print("Joystick not found or not visible.")
        sys.exit(1)

    center_x = box['x'] + box['width'] / 2
    center_y = box['y'] + box['height'] / 2
    radius = box['width'] / 2

    print(f"Joystick center: {center_x}, {center_y}")

    # 1. Move Left
    print("Moving Left...")
    page.mouse.move(center_x, center_y)
    page.mouse.down()
    page.mouse.move(center_x - radius, center_y) # Full left
    time.sleep(1.0)

    # 2. Jump (Up) while Moving Left
    print("Jumping Left...")
    page.mouse.move(center_x - radius, center_y - radius)

    frames = []
    start_time = time.time()
    while time.time() - start_time < 3.0:
        data = page.evaluate("""() => {
            if (!window.player) return null;
            return {
                state: window.player.currentState,
                frame: window.player.currentFrame,
                left: window.player.isFacingLeft
            };
        }""")

        if data:
            data['time'] = time.time() - start_time
            frames.append(data)
        else:
            print("Player not found in loop.")

        time.sleep(0.05)

    page.mouse.up()

    print("Captured Frames:")
    for f in frames:
        print(f)

    jumping_frames = [f['frame'] for f in frames if f['state'] == 'jumping' and f['left']]

    if not jumping_frames:
        print("ERROR: Did not detect jumping state.")
        states = set(f['state'] for f in frames)
        print(f"States found: {states}")
        sys.exit(1)

    print(f"Jumping Frames Sequence: {jumping_frames}")

    if 2 not in jumping_frames:
        print("ERROR: Frame 2 was not reached.")
        sys.exit(1)

    first_2_index = jumping_frames.index(2)
    subsequent_frames = jumping_frames[first_2_index:]

    print(f"Frames after reaching 2: {subsequent_frames}")

    if not all(f == 2 for f in subsequent_frames):
        print("ERROR: Frames did not hold at 2. Detected fluctuation.")
        sys.exit(1)

    print("SUCCESS: Animation held at frame 2.")
    page.screenshot(path="verification/jump_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # No extra permissions needed
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_left_jump(page)
        except Exception as e:
            print(f"Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()
