from playwright.sync_api import sync_playwright
import time

def verify_jump(page):
    print("Navigating to game...")
    page.goto("http://localhost:8000/index.html")

    # Wait for start button and click
    print("Waiting for start button...")
    page.wait_for_selector("#start-button", state="visible")
    page.click("#start-button")

    # Wait for menu and click play
    print("Waiting for play button...")
    page.wait_for_selector("#play-button", state="visible")
    # Need to wait for transition
    time.sleep(1)
    page.click("#play-button")

    # Wait for game to load (player to exist)
    print("Waiting for player...")
    page.wait_for_function("() => window.player && window.player.mesh")
    time.sleep(2) # Allow level load

    # --- Verify Right Jump ---
    print("\nTesting Right Jump...")
    # Inject inputs to simulate Joystick Right + Jump
    jump_right_data = page.evaluate("""() => {
        // Force inputs
        window.player.isGrounded = true;
        const controls = { joyVector: { x: 1.0, y: 1.0 }, attackHeld: false }; // Up-Right

        // Update player manually to trigger jump logic once
        window.player.update(0.016, controls);

        return {
            state: window.player.currentState,
            scaleX: window.player.mesh.scale.x,
            scaleY: window.player.mesh.scale.y,
            frame: window.player.currentFrame,
            facingLeft: window.player.isFacingLeft
        };
    }""")

    print(f"Right Jump State: {jump_right_data}")

    # Take screenshot of Right Jump
    page.screenshot(path="verification/jump_right.png")

    if jump_right_data['state'] != 'jumping':
        print("FAIL: State is not 'jumping' for Right Jump")
    if abs(jump_right_data['scaleX'] - 0.88) > 0.01:
        print(f"FAIL: Scale X should be ~0.88, got {jump_right_data['scaleX']}")
    else:
        print("PASS: Right Jump Scale is 0.88")

    # --- Verify Left Jump ---
    print("\nTesting Left Jump...")

    # Reset ground
    page.evaluate("window.player.isGrounded = true; window.player.currentState = 'idle';")

    # Inject inputs to simulate Joystick Left + Jump
    jump_left_data = page.evaluate("""() => {
        // Force inputs
        const controls = { joyVector: { x: -1.0, y: 1.0 }, attackHeld: false }; // Up-Left

        // Update player manually to trigger jump logic once
        window.player.update(0.016, controls);

        return {
            state: window.player.currentState,
            scaleX: window.player.mesh.scale.x,
            scaleY: window.player.mesh.scale.y,
            frame: window.player.currentFrame,
            facingLeft: window.player.isFacingLeft
        };
    }""")

    print(f"Left Jump State: {jump_left_data}")

    # Take screenshot of Left Jump
    page.screenshot(path="verification/jump_left.png")

    if jump_left_data['state'] != 'jumping':
        print("FAIL: State is not 'jumping' for Left Jump")
    if abs(jump_left_data['scaleX'] - 1.15) > 0.01:
        print(f"FAIL: Scale X should be ~1.15, got {jump_left_data['scaleX']}")
    else:
        print("PASS: Left Jump Scale is 1.15")

    # --- Verify Left Jump Inverse Frames ---
    print("\nTesting Left Jump Frame Logic...")
    # Advance time to see frame decrement
    next_frame_data = page.evaluate("""() => {
        // Advance time by 70ms (speed is 60ms)
        window.player.lastFrameTime = 0; // Force update
        const controls = { joyVector: { x: -1.0, y: 0.0 }, attackHeld: false }; // Keep moving left
        // Simulate update loop
        window.player.update(0.016, controls);

        return {
            frame: window.player.currentFrame
        };
    }""")
    print(f"Left Jump Next Frame: {next_frame_data['frame']} (Expected decrement from start)")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant audio permissions to avoid warnings, though headless might ignore
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_jump(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
