
import os
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Important: Do not grant 'autoplay' permission as per instructions
    context = browser.new_context()
    page = context.new_page()

    # Navigate to the game
    try:
        print("Navigating to game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for the Start button and click it
        print("Waiting for Start button...")
        page.wait_for_selector("#start-button", state="visible")
        page.click("#start-button")

        # Wait for the Play button (Menu) and click it
        print("Waiting for Play button...")
        page.wait_for_selector("#play-button", state="visible")
        # Give a little time for the intro transition if any
        page.wait_for_timeout(1000)
        page.click("#play-button")

        # Wait for the game canvas and UI to be visible
        print("Waiting for game load...")
        page.wait_for_selector("#bg-canvas", state="visible")
        page.wait_for_selector("#ui-container", state="visible")

        # Wait for the loading overlay to disappear
        page.wait_for_selector("#transition-overlay", state="hidden")

        # Wait a bit for the scene to render (Three.js init)
        print("Waiting for render...")
        page.wait_for_timeout(3000)

        # Take screenshot
        output_path = "/app/verification/game_view.png"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        page.screenshot(path=output_path)
        print(f"Screenshot saved to {output_path}")

    except Exception as e:
        print(f"Error: {e}")
        # Take error screenshot
        page.screenshot(path="/app/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
