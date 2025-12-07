from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000/Armeria/index.html")
        page.wait_for_load_state("networkidle")

        # Open a product modal (Product ID 1 - Graphic Tee)
        page.locator(".product-card").first.click()
        page.wait_for_selector(".modal-carousel-item", state="visible")

        # 1. Select Man + White
        # According to logic: Index 2
        page.click("button:has-text('HOMBRE')")
        page.locator(".color-btn.white").click()

        # We check scroll position.
        # Since images are 100% width, index 2 means scrollLeft ~= 2 * clientWidth
        carousel = page.locator("#modal-carousel-scroll")

        # Give it a moment to scroll
        page.wait_for_timeout(1000)

        scroll_left = carousel.evaluate("el => el.scrollLeft")
        client_width = carousel.evaluate("el => el.clientWidth")
        index = round(scroll_left / client_width)
        print(f"Man+White Index: {index} (Expected 2)")

        # 2. Select Woman + White
        # According to logic: Index 4
        page.click("button:has-text('MUJER')")
        page.locator(".color-btn.white").click()
        page.wait_for_timeout(1000)

        scroll_left = carousel.evaluate("el => el.scrollLeft")
        index = round(scroll_left / client_width)
        print(f"Woman+White Index: {index} (Expected 4)")

        # Take screenshot of final state
        page.screenshot(path="verification/verification_logic.png")
        browser.close()

if __name__ == "__main__":
    verify_changes()
