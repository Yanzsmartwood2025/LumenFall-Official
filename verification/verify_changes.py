from playwright.sync_api import sync_playwright
import time
import os

# Create verification directory
os.makedirs("verification", exist_ok=True)

def verify_interaction_logic(page):
    print("Navigating to game...")
    # Use file:// protocol for local file
    page.goto(f"file://{os.getcwd()}/Lumenfall-juego/index.html")

    # Wait for splash screen click
    print("Clicking start button...")
    page.click("#start-button")

    # Wait for menu transition and play button
    print("Waiting for play button...")
    page.wait_for_selector("#play-button", state="visible")

    # Click play to start game logic
    print("Clicking play button...")
    page.click("#play-button")

    # Wait for game to initialize (canvas visible)
    page.wait_for_selector("#bg-canvas", state="visible")

    # Give it a moment to load level
    time.sleep(2)

    print("Injecting verification logic...")

    # We will verify that:
    # 1. attemptInteraction function exists
    # 2. Input event listeners are attached (by simulating events)
    # 3. Raycaster logic is present

    result = page.evaluate("""
        () => {
            const log = [];

            // 1. Verify global variables
            if (typeof window.attemptInteraction === 'function') {
                log.push("PASS: attemptInteraction is a global function");
            } else {
                log.push("FAIL: attemptInteraction not found globally");
                // It might not be attached to window explicitly in game.js, but declared in scope.
                // However, since game.js is not a module, top-level vars should be on window?
                // Actually game.js is loaded as <script src="js/game.js"> so it is global scope.
            }

            // Check if raycaster exists
            // We can't easily check internal variables unless we exposed them or check side effects.
            // But we can check if firing a keydown 'E' calls the function.

            // Mock attemptInteraction to track calls
            let callCount = 0;
            const originalAttempt = window.attemptInteraction;
            window.attemptInteraction = () => {
                callCount++;
                if (originalAttempt) originalAttempt();
            };

            // Trigger 'E' key
            const eKey = new KeyboardEvent('keydown', { key: 'e' });
            window.dispatchEvent(eKey);

            if (callCount > 0) {
                log.push("PASS: Keydown 'E' triggers attemptInteraction");
            } else {
                log.push("FAIL: Keydown 'E' did not trigger attemptInteraction");
            }

            // Trigger 'Enter' key
            const enterKey = new KeyboardEvent('keydown', { key: 'Enter' });
            window.dispatchEvent(enterKey);

            if (callCount > 1) {
                log.push("PASS: Keydown 'Enter' triggers attemptInteraction");
            } else {
                log.push("FAIL: Keydown 'Enter' did not trigger attemptInteraction");
            }

            // Check canvas listeners
            const canvas = document.getElementById('bg-canvas');
            // We can't list listeners easily, but we can trigger mousedown

            // Mock raycaster logic?
            // It's hard to verify raycasting success without visual object,
            // but we can verify the listener doesn't crash.

            try {
                const mouseDown = new MouseEvent('mousedown', {
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2
                });
                canvas.dispatchEvent(mouseDown);
                log.push("PASS: Canvas mousedown dispatched without error");
            } catch (e) {
                log.push("FAIL: Canvas mousedown error: " + e.message);
            }

            return log;
        }
    """)

    print("Verification Results:")
    for line in result:
        print(line)

    # Take screenshot of game running
    page.screenshot(path="verification/game_running.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        # Launch with arguments to support WebGL/Audio in headless
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_interaction_logic(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
