from playwright.sync_api import sync_playwright

def verify_game_visuals():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Navigate to game
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # 1. Click Splash Screen Start Button
        print("Waiting for start button...")
        page.wait_for_selector("#start-button")
        page.click("#start-button")

        # 2. Wait for transition to Main Menu
        print("Waiting for menu screen...")
        page.wait_for_selector("#menu-screen", state="visible", timeout=10000)

        # 3. Click Play Button in Main Menu
        print("Waiting for play button...")
        page.wait_for_selector("#play-button")
        page.click("#play-button")

        # 4. Wait for Game to Start
        # If transition overlay is stuck visible, we might have an issue with audio context or transitionend.
        # However, let's try waiting for the canvas to be displayed block instead.
        print("Waiting for bg-canvas...")
        page.wait_for_selector("#bg-canvas", state="visible", timeout=10000)

        # Force transition overlay hidden just in case (hack for headless)
        page.evaluate("""
            const overlay = document.getElementById('transition-overlay');
            if(overlay) overlay.style.display = 'none';
        """)

        # Wait a bit for game loop to stabilize and render first frame
        page.wait_for_timeout(3000)

        # 5. Inject JS to shoot a fireball
        print("Shooting fireball...")
        page.evaluate("""
            if (window.player) {
                // Shoot Right
                window.player.power = window.player.maxPower;
                window.player.shoot({x: 1, y: 0});
            } else {
                console.error("Player object not found");
            }
        """)

        # Wait a moment for fireball to appear and travel a bit so we capture it
        page.wait_for_timeout(300)

        # Take screenshot
        screenshot_path = "/app/verification/visual_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_game_visuals()
