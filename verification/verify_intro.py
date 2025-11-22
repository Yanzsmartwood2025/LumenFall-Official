
import os
from playwright.sync_api import sync_playwright, expect

def verify_intro_image():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get absolute path to the HTML file
        cwd = os.getcwd()
        html_path = os.path.join(cwd, "Lumenfall-juego/index.html")

        # Navigate to the file
        page.goto(f"file://{html_path}")

        # Wait for the intro image to be visible
        intro_image = page.locator("#intro-image")
        expect(intro_image).to_be_visible()

        # Take a screenshot of the intro screen
        screenshot_path = "verification/intro_screen_fixed.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_intro_image()
