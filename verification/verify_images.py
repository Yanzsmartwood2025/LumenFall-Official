from playwright.sync_api import sync_playwright

def verify_images():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the page
        page.goto("http://localhost:8000/Armeria/index.html")

        # Wait for carousel to be visible
        page.wait_for_selector("#carousel-equipamiento")

        print("Page loaded")

        # 1. Verify THE INITIATE TEE (uses Camisetas-basicas)
        # Find the product card. Since there are multiple, we look for the text.
        # We need to click it to open modal
        initiate_tee_card = page.get_by_text("THE INITIATE TEE").first
        initiate_tee_card.click()

        # Wait for modal
        page.wait_for_selector("#product-modal.active")
        print("Modal opened for THE INITIATE TEE")

        # Wait for image
        page.wait_for_selector("#modal-main-img")

        # Get src
        src = page.eval_on_selector("#modal-main-img", "el => el.src")
        print(f"Image src: {src}")

        # Verify src contains new path
        if "Camisetas-basicas" in src:
            print("SUCCESS: Image path contains 'Camisetas-basicas'")
        else:
            print("FAILURE: Image path does not contain 'Camisetas-basicas'")

        # Take screenshot
        page.screenshot(path="verification/initiate_tee.png")

        # Close modal
        page.click("#product-modal .fa-arrow-left")
        page.wait_for_selector("#product-modal.active", state="detached")
        print("Modal closed")

        # 2. Verify LUMENFALL HOODIE (uses Sudaderas)
        # Need to scroll/swipe? The carousel might be scrollable.
        # Playwright auto-scrolls for actions usually.

        hoodie_card = page.get_by_text("LUMENFALL HOODIE").first
        hoodie_card.scroll_into_view_if_needed()
        hoodie_card.click()

        # Wait for modal
        page.wait_for_selector("#product-modal.active")
        print("Modal opened for LUMENFALL HOODIE")

        # Wait for image
        page.wait_for_selector("#modal-main-img")

        # Get src
        src = page.eval_on_selector("#modal-main-img", "el => el.src")
        print(f"Image src: {src}")

        # Verify src contains new path
        if "Sudaderas" in src:
            print("SUCCESS: Image path contains 'Sudaderas'")
        else:
            print("FAILURE: Image path does not contain 'Sudaderas'")

        # Take screenshot
        page.screenshot(path="verification/hoodie.png")

        browser.close()

if __name__ == "__main__":
    verify_images()
