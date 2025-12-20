
from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
        context = browser.new_context()
        page = context.new_page()

        # Load the game
        # Assuming the server serves from repo root. The file is Lumenfall-juego/index.html
        # We can use file:// protocol if no server is running, or start one.
        # But auth-core.js uses module type, which requires a server or specific browser flags.
        # Let s try starting a simple python http server in background first.

        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for loading
        # Check if assets loaded correctly (no 404s for new paths)
        # We can monitor network requests

        page.on("requestfailed", lambda request: print(f"Request failed: {request.url}"))

        # Click start
        page.click("#start-button")

        # Wait for menu
        page.wait_for_selector("#play-button", state="visible")

        # Click Play
        page.click("#play-button")

        # Wait for game to load (canvas)
        # Verify no console errors related to 404
        time.sleep(5)

        page.screenshot(path="verification/game_screen.png")
        print("Screenshot taken")

        browser.close()

if __name__ == "__main__":
    run()
