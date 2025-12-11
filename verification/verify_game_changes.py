from playwright.sync_api import sync_playwright

def verify_game_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Checking Lumenfall-juego/index.html...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")
        page.wait_for_load_state("networkidle")

        # Click start
        print("Clicking Start...")
        page.click("#start-button")

        # Wait for menu screen to appear
        print("Waiting for menu screen...")
        page.wait_for_selector("#menu-screen", state="visible")

        # Click Play button on menu screen to start actual gameplay
        print("Clicking Play...")
        page.click("#play-button")

        # Wait for menu to disappear and HUD to appear
        print("Waiting for HUD...")
        page.wait_for_selector("#menu-screen", state="hidden")
        page.wait_for_selector("#player-profile-container", state="visible")

        # Now click the player profile (Pause)
        print("Opening Pause Menu...")
        page.click("#player-profile-container")

        # Wait for pause menu
        page.wait_for_selector("#pause-menu.active")

        # Check for Vibration Intensity Slider
        print("Checking for Vibration Slider...")
        slider = page.query_selector("#vibration-intensity")

        if slider:
            print("SUCCESS: Vibration Intensity Slider found.")
        else:
            print("FAILURE: Vibration Intensity Slider NOT found.")

        page.screenshot(path="verification/game_settings.png")

        browser.close()

if __name__ == "__main__":
    verify_game_changes()
