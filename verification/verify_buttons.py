from playwright.sync_api import sync_playwright
import time

def verify_buttons():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Note: 'autoplay' permission not granted as per memory instructions
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Navigate to the game
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Click Start Button
        # Wait for start button to be visible
        page.wait_for_selector("#start-button", state="visible")
        page.click("#start-button")

        # Wait for transition (intro fade out)
        # The intro screen takes 1s to fade out if I recall css correctly, but logic waits for transitionend
        # Then menu appears.
        page.wait_for_selector("#play-button", state="visible", timeout=10000)
        page.click("#play-button")

        # Wait for game to start and UI to be visible
        # game.js: menuScreen fade out -> bg-canvas block, ui-container flex.
        page.wait_for_selector("#ui-container", state="visible", timeout=10000)
        time.sleep(1) # Extra buffer for opacity transitions

        # Locate buttons
        btn_attack = page.locator("#btn-attack")

        # Force state for visual verification of the Attack button
        # This simulates holding the button down
        page.evaluate("document.getElementById('btn-attack').classList.add('button-active-aura', 'pressed')")

        # Take screenshot of the right controls area
        page.locator(".right-controls").screenshot(path="verification/button_effect.png")

        browser.close()

if __name__ == "__main__":
    verify_buttons()
