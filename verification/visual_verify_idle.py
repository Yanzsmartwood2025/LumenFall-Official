from playwright.sync_api import sync_playwright
import time
import os

def capture_idle():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gl-drawing-for-tests",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        # Load game directly
        game_path = "file://" + os.path.abspath("Lumenfall-juego/index.html")
        page.goto(game_path)

        # Bypass Auth
        page.evaluate("""
            window.LumenfallAuth = {
                currentUser: { uid: 'test-user', displayName: 'Test User' },
                onAuthStateChanged: (cb) => cb({ uid: 'test-user', displayName: 'Test User' })
            };
        """)

        # Start game
        try:
            page.wait_for_selector('#start-button', state='visible', timeout=5000)
            page.click('#start-button')

            page.wait_for_selector('#play-button', state='visible', timeout=5000)
            time.sleep(1) # transition
            page.click('#play-button')

            # Wait for game to initialize
            time.sleep(3)

            # Ensure player is in idle and visible
            page.evaluate("window.player.currentState = 'idle';")

            # Take screenshot
            page.screenshot(path="verification/idle_visual.png")
            print("Screenshot captured: verification/idle_visual.png")

        except Exception as e:
            print(f"Error: {e}")

        browser.close()

if __name__ == "__main__":
    capture_idle()
