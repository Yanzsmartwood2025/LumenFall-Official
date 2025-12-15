
from playwright.sync_api import sync_playwright

def screenshot_enemy():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_context().new_page()
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Start game
        page.click("#start-button")
        page.wait_for_selector("#play-button")
        page.click("#play-button")

        # Wait for game to load
        page.wait_for_timeout(2000)

        # Teleport player to near the enemy (Enemy at -40)
        # We put player at -35 so enemy is to the left
        page.evaluate("window.player.mesh.position.x = -35")

        # Wait for camera to follow (camera lerps)
        page.wait_for_timeout(1000)

        # Take screenshot
        page.screenshot(path="verification/enemy_x1.png")
        print("Screenshot saved to verification/enemy_x1.png")
        browser.close()

if __name__ == "__main__":
    screenshot_enemy()
