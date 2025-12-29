from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
    context = browser.new_context()
    page = context.new_page()

    # Wait for the server to be ready (rudimentary check)
    import time
    time.sleep(5)

    try:
        # Navigate to the local server
        page.goto("http://localhost:5173")

        # Verify title
        expect(page).to_have_title("LUMENFALL - El Atrio")

        # Verify Splash Screen (wait for it to disappear or check existence)
        # It takes ~4s to disappear. Let's wait.
        print("Waiting for splash screen...")
        page.wait_for_timeout(5000)

        # Verify Header Logo
        expect(page.locator("header img")).to_be_visible()

        # Verify Links
        expect(page.get_by_text("JUGAR EL DEMO")).to_be_visible()
        expect(page.get_by_text("LEER EL LORE")).to_be_visible()

        # Take screenshot
        page.screenshot(path="verification/landing_page.png")
        print("Screenshot taken.")

    except Exception as e:
        print(f"Error: {e}")
        # Capture failure screenshot
        page.screenshot(path="verification/failure.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
