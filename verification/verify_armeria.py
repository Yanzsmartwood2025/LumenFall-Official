from playwright.sync_api import sync_playwright

def verify_armeria_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a mobile device or just a responsive window, since arrows might be more visible there or just standard desktop.
        # The site has max-width logic but looks like desktop is fine.
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to Armeria...")
        page.goto("http://localhost:8000/Armeria/index.html")

        # Wait for products to load
        page.wait_for_selector(".product-card")

        # Click the first product (ID 1 - Graphic Tee)
        print("Opening product...")
        page.locator(".product-card").first.click()

        # Wait for modal
        page.wait_for_selector("#product-modal.active")
        # Give it a second for animations (arrows animate)
        page.wait_for_timeout(1000)

        # Screenshot 1: Arrows should be visible
        print("Taking screenshot 1: Modal open with arrows...")
        page.screenshot(path="verification/1_modal_open_arrows.png")

        # Select Gender: Man
        print("Selecting Gender: HOMBRE...")
        page.get_by_role("button", name="HOMBRE").click()
        page.wait_for_timeout(500)

        # Select Color: White
        # Color buttons don't have text, but have class 'white'.
        print("Selecting Color: White...")
        # Finding the white color button. It has class 'white' and 'color-btn'.
        page.locator(".color-btn.white").click()
        page.wait_for_timeout(1000) # Wait for scroll

        # Screenshot 2: Image should have updated (scrolled)
        print("Taking screenshot 2: After selection...")
        page.screenshot(path="verification/2_selection_made.png")

        # Scroll the carousel to trigger arrow fade out
        print("Scrolling carousel...")
        carousel = page.locator("#modal-carousel-scroll")
        carousel.evaluate("el => el.scrollBy(100, 0)")
        page.wait_for_timeout(1000) # Wait for fade transition (500ms)

        # Screenshot 3: Arrows should be gone
        print("Taking screenshot 3: Arrows gone...")
        page.screenshot(path="verification/3_scrolled_arrows_gone.png")

        browser.close()

if __name__ == "__main__":
    verify_armeria_modal()
