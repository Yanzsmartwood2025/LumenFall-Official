from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000/Armeria/index.html")

        # Wait for page load
        page.wait_for_load_state("networkidle")

        # Verify Hero Slider has 6 items
        hero_slides = page.locator("#hero-slides .hero-slide")
        count = hero_slides.count()
        print(f"Hero slides count: {count}")

        # Open a product modal (Product ID 1)
        # Find the card with 'LUMENFALL GRAPHIC TEE' - it's the first one
        product_card = page.locator(".product-card").first
        product_card.click()

        # Wait for modal content to appear
        page.wait_for_selector(".modal-carousel-item", state="visible")

        # Take screenshot of the modal with the carousel
        page.screenshot(path="verification/verification_modal.png")

        # Check if carousel exists
        carousel = page.locator("#modal-carousel-scroll")
        if carousel.is_visible():
            print("Carousel is visible")

            # Count items in carousel. Should be 6 for product 1
            items = carousel.locator(".modal-carousel-item")
            item_count = items.count()
            print(f"Carousel items count: {item_count}")

        browser.close()

if __name__ == "__main__":
    verify_changes()
