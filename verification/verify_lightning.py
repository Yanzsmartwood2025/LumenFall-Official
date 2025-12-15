from playwright.sync_api import sync_playwright, expect
import time

def verify_lightning():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Load the game
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Click start button
        page.locator("#start-button").click()

        # Wait for menu
        time.sleep(2)

        # Click Play button
        page.locator("#play-button").click()

        # Wait for game to load
        time.sleep(4)

        # Trigger Lightning Strike via console
        # We'll trigger it and immediately screenshot to catch the flash and bolt
        page.evaluate("window.triggerLightningStrike()")

        # Taking multiple screenshots to catch the flicker/bolt
        # The bolt lasts 0.5s, flickering
        for i in range(5):
            page.screenshot(path=f"verification/lightning_flash_{i}.png")
            time.sleep(0.1)

        browser.close()

if __name__ == "__main__":
    verify_lightning()
