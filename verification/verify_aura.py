from playwright.sync_api import sync_playwright, expect
import time

def verify_aura_effect():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        # Note: Do not grant autoplay permission explicitly if it causes issues,
        # but here we need audio context to start, which usually requires user interaction.
        context = browser.new_context()
        page = context.new_page()

        try:
            # Navigate to game
            page.goto("http://localhost:8000/Lumenfall-juego/index.html")

            # 1. Click Start Button
            page.click("#start-button")

            # Wait for Intro to finish (transitionend) or just wait time
            # The code has setTimeout 10ms after transitionend of opacity
            # Let's wait a bit
            time.sleep(2)

            # 2. Click Play Button (JUGAR) on Menu
            # Use a selector that is visible
            page.click("#play-button")

            # Wait for game to load (startGame function)
            # It loads audio, then fades out menu.
            time.sleep(2)

            # Verify game canvas is visible
            expect(page.locator("#bg-canvas")).to_be_visible()

            # 3. Simulate Charge (Attack Hold)
            # Dispatch mousedown on #btn-attack
            print("Holding attack button...")
            page.dispatch_event("#btn-attack", "mousedown")

            # Wait for > 200ms for charge state to activate
            time.sleep(0.5)

            # Take screenshot while holding
            screenshot_path = "verification/aura_verification.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            # Release button
            page.dispatch_event("#btn-attack", "mouseup")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_aura_effect()
