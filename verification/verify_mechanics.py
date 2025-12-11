
from playwright.sync_api import sync_playwright, expect
import time

def verify_game_mechanics():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Avoid autoplay permission to prevent errors
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Start Game
        print("Starting game...")
        start_btn = page.locator("#start-button")
        expect(start_btn).to_be_visible()
        start_btn.click()

        play_btn = page.locator("#play-button")
        expect(play_btn).to_be_visible(timeout=10000)
        play_btn.click()

        # Wait for game HUD
        halo = page.locator("#joziel-halo")
        expect(halo).to_be_visible(timeout=20000)
        print("Game HUD visible.")

        # Simulate Charge/Attack Hold
        print("Simulating Charge (Attack hold)...")
        # We can't easily simulate complex interactions on canvas via selectors,
        # but we can verify the state if we could hook into JS, or at least take a screenshot of the charge effect.

        # Trigger 'mousedown' on attack button
        btn_attack = page.locator("#btn-attack")
        btn_attack.dispatch_event("mousedown")

        # Wait a bit for charge effect and power regen
        time.sleep(1)

        page.screenshot(path="verification/charge_effect.png")
        print("Captured charge effect.")

        # Trigger 'mouseup' to stop
        btn_attack.dispatch_event("mouseup")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_game_mechanics()
