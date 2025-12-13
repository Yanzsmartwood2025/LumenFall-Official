
from playwright.sync_api import sync_playwright
import time

def verify_lumenfall():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Important: Don't grant autoplay to avoid "context must be created with..." error from memory
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:8080/Lumenfall-juego/index.html")

        # Wait for Start button
        print("Waiting for Start button...")
        page.wait_for_selector("#start-button")

        # Click Start
        print("Clicking Start...")
        page.click("#start-button")

        # Wait for Intro to finish and Menu to appear
        print("Waiting for Menu...")
        page.wait_for_selector("#play-button", state="visible", timeout=10000)

        # Click Play
        print("Clicking Play...")
        page.click("#play-button")

        # Wait for Game UI (Energy Bar) to confirm game started
        print("Waiting for Game UI...")
        page.wait_for_selector("#energy-bar", state="visible", timeout=10000)

        # Wait a bit for level to load and rendering to start
        time.sleep(2)

        # Check UI Visibility (z-index check implicitly by screenshot, but we can check computed style)
        ui_z_index = page.evaluate("window.getComputedStyle(document.getElementById('ui-container')).zIndex")
        print(f"UI Container z-index: {ui_z_index}")

        # Simulate movement to trigger particles
        # We need to simulate Joystick or Keyboard. The game supports keyboard?
        # Looking at code: No keyboard listeners in game.js, only Joystick and Gamepad.
        # But wait, Joystick uses mouse events. We can simulate mouse drag on joystick.

        print("Simulating Joystick movement...")
        joystick = page.locator("#joystick-container")
        box = joystick.bounding_box()
        if box:
            center_x = box['x'] + box['width'] / 2
            center_y = box['y'] + box['height'] / 2

            # Start drag center
            page.mouse.move(center_x, center_y)
            page.mouse.down()
            # Move right to run
            page.mouse.move(center_x + 50, center_y)

            # Hold for a second to generate particles
            time.sleep(1)

            # Take screenshot while running
            print("Taking screenshot...")
            page.screenshot(path="verification/lumenfall_running.png")

            page.mouse.up()

        browser.close()

if __name__ == "__main__":
    verify_lumenfall()
