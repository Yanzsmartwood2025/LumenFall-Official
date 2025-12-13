
import time
from playwright.sync_api import sync_playwright

def verify_torches():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant permissions if needed, though user mentioned autoplay issues, so keep it standard
        context = browser.new_context()
        page = context.new_page()

        # 1. Load the game
        print("Loading game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # 2. Click Start
        print("Clicking Start...")
        page.click("#start-button")

        # 3. Wait for game to load (transition overlay hidden)
        # The transition overlay has class 'visible' when active.
        # Initially it might be visible or not.
        # Wait for menu screen to disappear and bg-canvas to be visible
        page.wait_for_selector("#bg-canvas", state="visible")

        # Give it some time to render frames and animations
        time.sleep(3)

        # 4. Check Frustum Culling and Torch Color
        # We can execute JS in the page context
        print("Checking Torch Properties...")
        result = page.evaluate("""() => {
            const results = {
                frustumCulledCounts: { true: 0, false: 0 },
                torchColor: null,
                torchType: null,
                torchFrustumCulled: null
            };

            // Traverse scene to check frustumCulled
            // Assuming 'scene' is available globally (non-module script)
            if (window.scene) {
                window.scene.traverse((obj) => {
                    if (obj.isMesh || obj.isSprite) {
                        if (obj.frustumCulled) results.frustumCulledCounts.true++;
                        else results.frustumCulledCounts.false++;
                    }
                });
            }

            // Check specific torch
            // allFlames array should be available globally
            if (window.allFlames && window.allFlames.length > 0) {
                const flame = window.allFlames[0]; // AmbientTorchFlame instance
                results.torchType = flame.constructor.name;
                if (flame.sprite) {
                    results.torchFrustumCulled = flame.sprite.frustumCulled;
                    results.torchColor = flame.sprite.material.color.getHexString();
                }
            }
            return results;
        }""")

        print(f"Verification Results: {result}")

        # 5. Take Screenshot
        screenshot_path = "verification/torches_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_torches()
