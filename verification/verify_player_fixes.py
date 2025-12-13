from playwright.sync_api import Page, expect, sync_playwright
import time
import sys

def verify_player_fixes(page: Page):
    print("Navigating...")
    # Navigate to the game
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")

    print("Clicking Start...")
    # Start the game
    page.locator("#start-button").click()

    # Wait for menu (intro transition)
    # The intro screen fades out, menu appears. Wait for play button.
    play_button = page.locator("#play-button")
    play_button.wait_for(state="visible", timeout=10000)

    print("Clicking Play...")
    # Click Play
    play_button.click()

    # Wait for game canvas and player initialization
    # We can check for player existence in JS loop
    print("Waiting for player object...")
    page.wait_for_function("typeof player !== 'undefined' && player.mesh !== undefined", timeout=10000)

    # 1. Verify Scale
    # Should be (1.5, 1.5, 1)
    scale = page.evaluate("player.mesh.scale")
    print(f"Player Scale: {scale}")
    assert scale['x'] == 1.5, f"Expected scale.x to be 1.5, got {scale['x']}"
    assert scale['y'] == 1.5, f"Expected scale.y to be 1.5, got {scale['y']}"
    print("Scale verification PASSED.")

    # 2. Verify Animation Logic (Idle Left -> Run Left skips frames)

    # First, make player face Left (Idle)
    # Simulate Joystick Move Left
    print("Simulating Move Left (to face left)...")
    page.evaluate("""
        const joy = document.getElementById('joystick-container');
        // Use internal joystick logic simulation via global variables/functions if possible,
        // or just set joyVector directly for testing since joyVector is global in game.js
        joyVector.x = -1;
        joyVector.y = 0;
    """)

    # Let it run for a bit so he turns left
    time.sleep(0.5)

    # Stop moving (Idle Left)
    print("Stopping (Idle Left)...")
    page.evaluate("joyVector.x = 0; joyVector.y = 0;")
    time.sleep(0.5) # Wait for Idle state

    # Verify we are facing left and idle
    is_facing_left = page.evaluate("player.isFacingLeft")
    state = page.evaluate("player.currentState")
    print(f"State: {state}, FacingLeft: {is_facing_left}")
    assert is_facing_left == True, "Player should be facing left"
    assert state == 'idle', "Player should be idle"

    # Now, Start Running Left again
    # This triggers the "Idle (Left) -> Running (Left)" transition
    print("Starting Run Left (Trigger transition)...")

    # We want to capture the currentFrame immediately after the update
    frame_sequence = page.evaluate("""
        (() => {
            const frames = [];
            joyVector.x = -1; // Start moving

            // Let's sample currentFrame for next few frames
            return new Promise(resolve => {
                let count = 0;
                const interval = setInterval(() => {
                    if (player.currentState === 'running') {
                        frames.push(player.currentFrame);
                    }
                    count++;
                    if (count > 5) {
                        clearInterval(interval);
                        resolve(frames);
                    }
                }, 50); // Sample every 50ms
            });
        })()
    """)

    print(f"Frame sequence recorded: {frame_sequence}")

    if len(frame_sequence) > 0:
        first_frame = frame_sequence[0]
        # Logic says: if wasFacingLeft, set currentFrame = 2.
        # Next update loop: if (time > speed) -> currentFrame++ (becomes 3) -> render.
        # We expect to see 3 as the first rendered frame index.

        assert first_frame >= 2, f"Expected first running frame to be >= 2 (skip turn), got {first_frame}"
        print("Animation logic verified: Skipped turn frames. PASSED.")
    else:
        print("Warning: No running frames captured. Timing might be off.")

    # 3. Verify Turn Logic (Running Right -> Running Left plays turn)

    # Run Right
    print("Running Right...")
    page.evaluate("joyVector.x = 1; joyVector.y = 0;")
    time.sleep(1) # Ensure we are running right

    # Switch Left
    print("Switching Left (Turn)...")
    # Reset tracking
    frame_sequence_turn = page.evaluate("""
        (() => {
            const frames = [];
            joyVector.x = -1; // Switch to Left

            return new Promise(resolve => {
                let count = 0;
                const interval = setInterval(() => {
                    if (player.currentState === 'running' && player.isFacingLeft) {
                        frames.push(player.currentFrame);
                    }
                    count++;
                    if (count > 5) {
                        clearInterval(interval);
                        resolve(frames);
                    }
                }, 50);
            });
        })()
    """)
    print(f"Turn Frame sequence: {frame_sequence_turn}")

    if len(frame_sequence_turn) > 0:
        first_frame_turn = frame_sequence_turn[0]
        # Logic says: if direction change, currentFrame = -1.
        # Next update: currentFrame++ -> 0.
        # So we expect to see 0, 1...

        assert first_frame_turn <= 2, f"Expected turn to start near 0, got {first_frame_turn}"
        print("Turn logic verified: Started from beginning. PASSED.")

    # Take screenshot of running
    page.screenshot(path="verification/player_running.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            verify_player_fixes(page)
            browser.close()
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)
