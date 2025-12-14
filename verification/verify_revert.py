from playwright.sync_api import sync_playwright

def verify_lumenfall(page):
    # Navigate to the game
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")

    # Wait for the start button
    page.wait_for_selector("#start-button", timeout=10000)

    # Take a screenshot of the start screen
    page.screenshot(path="verification/start_screen.png")

    print("Start screen screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Remove invalid permission 'autoplay'
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_lumenfall(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
