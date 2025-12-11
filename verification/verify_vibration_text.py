
from playwright.sync_api import sync_playwright, expect

def verify_vibration_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Remove 'autoplay' permission as it causes error in this environment
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Click Start Button
        print("Clicking Start...")
        start_btn = page.locator("#start-button")
        expect(start_btn).to_be_visible()
        start_btn.click()

        # Wait for Play button
        play_btn = page.locator("#play-button")
        expect(play_btn).to_be_visible(timeout=10000)
        print("Clicking Play...")
        play_btn.click()

        # Wait for the Pause Button (Halo) to appear
        halo = page.locator("#joziel-halo")
        expect(halo).to_be_visible(timeout=20000)
        print("Game started. Clicking Pause (Halo)...")

        # Click Halo to pause
        halo.click()

        # Wait for Pause Menu
        pause_menu = page.locator("#pause-menu")
        expect(pause_menu).to_have_class("active", timeout=5000)
        print("Pause menu active.")

        # Find Vibration Toggle
        vib_btn = page.locator("#vibration-toggle")

        # Initial State: SUAVE (Level 1)
        print("Verifying initial state (SUAVE)...")
        expect(vib_btn).to_have_text("Vibración: SUAVE")

        # Click 1 -> FUERTE (Level 2)
        print("Toggling to FUERTE...")
        vib_btn.click()
        expect(vib_btn).to_have_text("Vibración: FUERTE")

        # Click 2 -> OFF (Level 0)
        print("Toggling to OFF...")
        vib_btn.click()
        expect(vib_btn).to_have_text("Vibración: OFF")

        # Click 3 -> SUAVE (Level 1)
        print("Toggling back to SUAVE...")
        vib_btn.click()
        expect(vib_btn).to_have_text("Vibración: SUAVE")

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/vibration_ui.png")

        browser.close()
        print("Verification successful.")

if __name__ == "__main__":
    verify_vibration_ui()
