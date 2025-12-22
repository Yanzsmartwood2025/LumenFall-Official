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
        try:
            page.wait_for_selector('#start-button', state='visible', timeout=5000)
            page.click('#start-button')
            time.sleep(1) # Wait for transition
        except Exception as e:
            print(f"Start button error: {e}")

        print("Clicking play...")
        try:
             page.wait_for_selector('#play-button', state='visible', timeout=5000)
             page.click('#play-button')
             time.sleep(3) # Wait for game load
        except Exception as e:
             print(f"Play button error: {e}")
             page.screenshot(path="verification/play_error.png")

        # Inject logic to test animations
        print("Injecting test logic...")

        # We need to escape the f-string for JS template literals if we use them,
        # OR just use string concatenation in JS to avoid Python f-string conflict

        script = """
        async () => {
            if (!window.player) return ["Error: window.player is undefined"];
            window.isPaused = false;
            const p = window.player;
            const results = [];

            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // Test 1: IDLE RIGHT
            p.currentState = 'idle';
            p.isFacingLeft = false;
            p.currentFrame = -1;
            p.mesh.rotation.y = 0; // Force update
            // Wait for a few frames of update loop
            await wait(200);
            results.push("IdleRight Scale: " + p.mesh.scale.x.toFixed(2));
            results.push("IdleRight Texture: " + (p.mesh.material.map ? p.mesh.material.map.source.data.src : 'null'));

            // Test 2: ATTACK LEFT
            p.currentState = 'shooting';
            p.isFacingLeft = true;
            p.currentFrame = -1;
            // Trigger update to set texture
             await wait(100);
            results.push("AttackLeft Scale: " + p.mesh.scale.x.toFixed(2));
             // Check if texture is the correct one (contains disparo-izquierda)
             results.push("AttackLeft Texture: " + (p.mesh.material.map ? p.mesh.material.map.source.data.src : 'null'));

            return results;
        }
        """

        try:
            results = page.evaluate(script)
            print("Animation Results:")
            for r in results:
                print(r)

            page.screenshot(path="verification/animation_test.png")

        except Exception as e:
            print(f"Error during evaluate: {e}")
            page.screenshot(path="verification/error.png")

        browser.close()

if __name__ == "__main__":
    check_animations()
