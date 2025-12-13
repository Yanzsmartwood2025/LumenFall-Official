from playwright.sync_api import sync_playwright

def verify_visuals():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Avoid granting permissions that might fail in headless or cause issues
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for the game to load and start button to appear
        print("Waiting for start button...")
        page.wait_for_selector("#start-button", state="visible")

        # Click start to enter game
        print("Clicking start...")
        page.click("#start-button")

        # Wait for the canvas to be visible and game to initialize
        print("Waiting for canvas...")
        page.wait_for_selector("#bg-canvas", state="visible")

        # Wait a bit for level load and animations
        page.wait_for_timeout(3000)

        # Take screenshot of the gameplay
        print("Taking screenshot...")
        screenshot_path = "verification/visual_update.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_visuals()
