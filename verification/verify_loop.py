from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_animation_loop(page: Page):
    # Navigate to the game
    print("Navigating to game...")
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")

    # Wait for the Start button
    start_button = page.locator("#start-button")
    expect(start_button).to_be_visible()

    # Click start (might need to handle orientation or intro if simulated mobile)
    print("Clicking Start...")
    start_button.click()

    # Wait for intro to finish and menu to appear
    # The game shows intro screen then transitions to menu screen
    play_button = page.locator("#play-button")

    print("Waiting for Play button...")
    # Might take a moment for transitions
    expect(play_button).to_be_visible(timeout=10000)

    # Click PLAY
    print("Clicking PLAY...")
    play_button.click()

    # Wait for game to start (canvas visible, player initialized)
    # Checking for canvas presence
    expect(page.locator("#bg-canvas")).to_be_visible()

    # Wait a bit for level load and player init
    time.sleep(2)

    # Access the player object and simulate running left
    # We will use page.evaluate to inject input and monitor frames

    print("Simulating running left...")

    # We can simulate keyboard input for running left if the game supports it?
    # Looking at game.js, it uses virtual joystick or gamepad.
    # But joyVector is controlled by joystick mouse/touch events.
    # We can hack joyVector directly since it's a global variable in the script scope?
    # No, 'joyVector' is defined inside game.js in top level scope, but not attached to window.
    # However, 'player' is also top level.

    # Since game.js is loaded as a script (not module), top-level variables declared with 'let' or 'const'
    # are NOT on window, but they are in the global lexical scope. Chrome DevTools can access them,
    # but page.evaluate runs in the global scope.
    # Wait, 'let' at top level of a script IS global scope but not window property.
    # To access it inside evaluate, we might have trouble if we rely on window.player.

    # Let's check if we can manipulate the joystick via events.
    # Or we can use the fact that 'joyVector' is updated by mouse events on joystick container.

    # Let's try to drag the joystick left.
    joystick = page.locator("#joystick-container")
    if joystick.is_visible():
        box = joystick.bounding_box()
        center_x = box['x'] + box['width'] / 2
        center_y = box['y'] + box['height'] / 2

        # Mouse down at center
        page.mouse.move(center_x, center_y)
        page.mouse.down()
        # Move left
        page.mouse.move(center_x - 50, center_y)

        print("Joystick moved left.")

        # Monitor frames for a few seconds
        # We need to expose 'player' to window to read it easily, OR assume we can read it.
        # If 'player' is not on window, we can't easily read it from evaluate string unless we are in the same context.
        # But evaluate executes within the page context.

        # Let's try to see if 'player' is defined.
        # If not, we might need to rely on visual inspection via screenshot,
        # or we might need to modify game.js temporarily to expose player to window for testing.

        # Checking if player is on window:
        is_player_on_window = page.evaluate("() => typeof window.player !== 'undefined'")
        print(f"Is player on window? {is_player_on_window}")

        if not is_player_on_window:
            # Let's try accessing 'player' directly (implicit global)
            try:
                # This might throw ReferenceError if it's let/const not on window
                has_player = page.evaluate("() => { try { return !!player; } catch(e) { return false; } }")
                print(f"Can access 'player' variable directly? {has_player}")
            except Exception as e:
                print(f"Error accessing player: {e}")

        # If we can access player...
        frames = []
        for _ in range(20):
            # Sample current frame
            # We want to catch the loop behavior.
            # Assuming we can access player...
            frame_script = """() => {
                try {
                    return player ? player.currentFrame : -1;
                } catch(e) { return -2; }
            }"""
            frame = page.evaluate(frame_script)
            frames.append(frame)
            time.sleep(0.1)

        print(f"Captured frames while running left: {frames}")

        # Take a screenshot
        page.screenshot(path="/home/jules/verification/running_left.png")

        # Release mouse
        page.mouse.up()

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create context with permissions if needed, but here simple navigation
        # User memory says "autoplay permission should not be explicitly granted... as it causes failures"
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_animation_loop(page)
        finally:
            browser.close()
