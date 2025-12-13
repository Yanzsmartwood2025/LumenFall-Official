from playwright.sync_api import sync_playwright

def verify_game_loads():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to the game
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Take a screenshot immediately to see what's happening
        page.screenshot(path="verification/initial_load.png")

        # It seems #play-button is hidden. Maybe start-button is what we need?
        # The game flow in code: start-button -> intro -> menu (play-button)
        if page.is_visible("#start-button"):
            print("Clicking Start Button")
            page.click("#start-button")
            # Wait for transition to menu
            page.wait_for_timeout(2000)

        page.screenshot(path="verification/after_start.png")

        if page.is_visible("#play-button"):
             print("Clicking Play Button")
             page.click("#play-button")
        else:
             print("Play button still not visible, forcing visible check log")

        # Wait for game to load
        page.wait_for_timeout(3000)

        page.screenshot(path="verification/gameplay.png")

        browser.close()

if __name__ == "__main__":
    verify_game_loads()
