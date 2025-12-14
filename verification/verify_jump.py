from playwright.sync_api import sync_playwright

def verify_left_jump(page):
    # Navigate to the game
    page.goto('http://localhost:8000/Lumenfall-juego/index.html')

    # Wait for the Start button and click it
    page.wait_for_selector('#start-button')
    page.click('#start-button')

    # Wait for the Play button and click it to start the game loop
    page.wait_for_selector('#play-button', state='visible')
    # Use evaluate to click play button directly to avoid overlay issues or wait for animation
    page.evaluate("document.getElementById('play-button').click()")

    # Wait for the player to be initialized
    page.wait_for_function('window.player !== undefined')

    # 1. Test Rising Phase
    print("Testing Rising Phase...")
    rising_frame = page.evaluate("""() => {
        window.player.isFacingLeft = true;
        window.player.currentState = 'jumping';
        window.player.velocity.y = 0.5; // Positive velocity (rising)
        window.player.currentFrame = 7; // Reset to start
        window.player.lastFrameTime = 0; // Force update

        // Advance time to trigger update
        const deltaTime = 0.016;
        window.player.update(deltaTime, { joyVector: { x: -1, y: 1 }, attackHeld: false });

        return window.player.currentFrame;
    }""")

    print(f"Rising Frame (Should be < 7): {rising_frame}")
    # Logic is decrementing from 7. After one update with 0 lastFrameTime, it should be 6.

    # Check "Don't enter frame 2 while rising" logic
    rising_clamped = page.evaluate("""() => {
        window.player.currentFrame = 3; // At limit
        window.player.lastFrameTime = 0;
        window.player.update(0.016, { joyVector: { x: -1, y: 1 }, attackHeld: false });
        return window.player.currentFrame;
    }""")
    print(f"Rising Frame Limit Check (Should be 3): {rising_clamped}")

    # 2. Test Falling Phase
    print("Testing Falling Phase...")
    falling_frame = page.evaluate("""() => {
        window.player.velocity.y = -0.1; // Negative velocity (falling)
        window.player.currentFrame = 5; // Arbitrary previous frame
        window.player.lastFrameTime = 0;
        window.player.update(0.016, { joyVector: { x: -1, y: 1 }, attackHeld: false });
        return window.player.currentFrame;
    }""")

    print(f"Falling Frame (Should be 2): {falling_frame}")

    # 3. Take a screenshot of the "Falling" state to verify visual result (Frame 2)
    # We force the state and render one frame
    page.evaluate("""() => {
        window.player.velocity.y = -0.1;
        window.player.currentFrame = 2; // Set frame 2
        window.player.update(0.016, { joyVector: { x: -1, y: 1 }, attackHeld: false });
    }""")

    # Wait a bit for the canvas to render
    page.wait_for_timeout(100)
    page.screenshot(path='/app/verification/left_jump_fall.png')
    print("Screenshot saved to /app/verification/left_jump_fall.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_left_jump(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
