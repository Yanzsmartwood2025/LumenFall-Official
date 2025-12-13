from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant permissions to avoid permission prompts
        context = browser.new_context(permissions=['accelerometer', 'gyroscope', 'magnetometer'])
        page = context.new_page()

        # 1. Load the game
        print("Loading game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")
        page.wait_for_timeout(2000)

        # 2. Start Game
        print("Clicking Start...")
        page.click("#start-button")
        page.wait_for_timeout(2000)

        print("Clicking Play...")
        # Ensure 'Jugar' button is visible/clickable
        page.click("#play-button")
        page.wait_for_timeout(3000) # Wait for game load

        # 3. Verify Buttons (Transparent, no filter)
        print("Verifying buttons...")
        page.screenshot(path="verification/buttons_check.png")

        # 4. Verify Running Left Shadow
        print("Simulating Running Left...")
        # We need to simulate joystick input or keyboard if supported,
        # but the game uses a virtual joystick `joyVector`.
        # Let's inject JS to force player movement.
        page.evaluate("""
            if (window.player) {
                // Force facing left
                window.player.currentState = 'running';
                window.player.isFacingLeft = true;
                window.player.velocity.x = -0.2;
                window.player.mesh.position.y = 2.1; // Grounded

                // Advance frames to ensure we hit the loop (>=5) for shadow to appear
                window.player.currentFrame = 6;

                // Force update to render this state
                window.player.lastFrameTime = 0;
            }
        """)
        page.wait_for_timeout(200) # Wait a bit for render
        page.screenshot(path="verification/running_left_shadow.png")

        # 5. Verify Fireball Rotation
        print("Simulating Fireball...")
        # Inject projectile
        page.evaluate("""
            if (window.player) {
                const aimVector = { x: 1, y: 0 }; // Shoot right
                window.player.shoot(aimVector);
            }
        """)
        page.wait_for_timeout(100)
        page.screenshot(path="verification/fireball_rotation.png")

        # 6. Verify Lightning
        print("Simulating Lightning...")
        page.evaluate("triggerLightningStrike()")
        page.wait_for_timeout(150) # Catch the flash
        page.screenshot(path="verification/lightning_flash.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
