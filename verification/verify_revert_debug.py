from playwright.sync_api import sync_playwright

def verify_lumenfall(page):
    # Setup console listener
    page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))

    # Navigate to the game
    print("Navigating to game...")
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")

    # Wait for the start button
    try:
        page.wait_for_selector("#start-button", timeout=5000)
        print("Start button found.")
        page.click("#start-button")
        print("Start button clicked.")
    except Exception as e:
        print(f"Start button not found: {e}")

    # Check intro screen image
    try:
        # Check if #intro-image has a src
        src = page.evaluate("document.querySelector('#intro-image').src")
        print(f"Intro Image Src: {src}")

        # Check if broken (naturalWidth == 0)
        width = page.evaluate("document.querySelector('#intro-image').naturalWidth")
        print(f"Intro Image Width: {width}")

        # Take a screenshot
        page.screenshot(path="verification/debug_screenshot.png")
        print("Debug screenshot taken.")
    except Exception as e:
        print(f"Error checking intro image: {e}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_lumenfall(page)
        except Exception as e:
            print(f"Script Error: {e}")
        finally:
            browser.close()
