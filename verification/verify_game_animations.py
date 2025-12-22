from playwright.sync_api import sync_playwright, expect
import time
import os

def check_animations():
    with sync_playwright() as p:
        # Launch with arguments to allow WebGL/Audio
        browser = p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
        )
        context = browser.new_context()
        page = context.new_page()

        # Load game
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Bypass Intro
        print("Clicking start...")
        page.click('#start-button')
        time.sleep(1) # Wait for transition

        print("Clicking play...")
        page.click('#play-button')
        time.sleep(2) # Wait for game load

        # Inject logic to test animations
        print("Injecting test logic...")
        # We will cycle through states and log currentFrame and scale

        script = """
        async () => {
            window.isPaused = false; // Ensure running
            const p = window.player;
            const results = [];

            // Function to wait frames
            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // Test 1: IDLE RIGHT (Should be 3x2 Grid)
            p.currentState = 'idle';
            p.isFacingLeft = false;
            p.currentFrame = -1;
            await wait(200); // Wait for update
            results.push();

            // Test 2: RUN RIGHT (Should be 8x2 Grid)
            p.currentState = 'running';
            p.isFacingLeft = false;
            p.currentFrame = -1;
            await wait(100);
            results.push();

            // Test 3: IDLE LEFT (Should be 6x1 Strip)
            p.currentState = 'idle';
            p.isFacingLeft = true;
            p.currentFrame = -1;
            await wait(200);
            results.push();

            // Test 4: ATTACK LEFT (Should be 6x1 Strip)
            p.currentState = 'shooting';
            p.isFacingLeft = true;
            p.currentFrame = -1;
            await wait(100);
            results.push();

            return results;
        }
        """

        try:
            results = page.evaluate(script)
            print("Animation Results:")
            for r in results:
                print(r)

            # Take screenshot of Idle Right
            page.screenshot(path="verification/animation_test.png")

        except Exception as e:
            print(f"Error during evaluate: {e}")
            page.screenshot(path="verification/error.png")

        browser.close()

if __name__ == "__main__":
    check_animations()
