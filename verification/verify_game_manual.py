from playwright.sync_api import sync_playwright
import time
import os

def check_manual():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
        )
        page = browser.new_page()
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Wait for scripts to load
        time.sleep(1)

        script = """
        () => {
            try {
                // Manually create player (assumes classes are global/in scope)
                // In game.js, classes are top-level.
                const p = new Player();
                window.player = p;

                // Check Scale
                const scale = p.mesh.scale.x;

                // Check Idle Texture (Initial)
                const idleSrc = p.idleTexture.image ? p.idleTexture.image.src : 'loading';

                return {
                    scale: scale,
                    src: idleSrc,
                    playerCreated: true
                };
            } catch (e) {
                return { error: e.toString() };
            }
        }
        """

        result = page.evaluate(script)
        print("Manual Instantiation Result:", result)

        # If successful, check update logic
        if 'playerCreated' in result:
             script_update = """
             () => {
                 const p = window.player;
                 // Simulate Attack Left
                 p.currentState = 'shooting';
                 p.isFacingLeft = true;
                 p.currentFrame = 0;

                 // Run update loop manually for a frame
                 p.update(0.016, { joyVector: {x:0, y:0}, attackHeld: false });

                 return {
                     state: p.currentState,
                     scale: p.mesh.scale.x
                 };
             }
             """
             res2 = page.evaluate(script_update)
             print("Update Result:", res2)

        browser.close()

if __name__ == "__main__":
    check_manual()
