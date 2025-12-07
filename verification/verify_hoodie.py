from playwright.sync_api import sync_playwright

def verify_hoodie_images():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000/Armeria/index.html")

        # Click on the product card for "LUMENFALL HOODIE"
        # We can find it by text or by scanning product cards.
        # "LUMENFALL HOODIE" is the name.
        page.get_by_text("LUMENFALL HOODIE").click()

        # Wait for the modal to be active
        page.wait_for_selector("#product-modal.active")

        # Verify the title
        title = page.locator("#m-title").text_content()
        print(f"Product Title: {title}")

        # In the modal, we want to verify that the product has 6 images.
        # However, the modal only shows one image at a time (main image).
        # The user's request was about completing the carousel in the code.
        # But the carousel logic in the main store (renderStore function) creates the carousel.
        # Let's verify the main store carousel for this product.

        # Close the modal to inspect the main store carousel
        page.locator("button[onclick='closeProduct()']").click()
        page.wait_for_selector("#product-modal:not(.active)")

        # Find the product card for "LUMENFALL HOODIE" again.
        # The product ID is 4. The fade container ID is 'fade-4'.
        fade_container = page.locator("#fade-4")

        # Count the number of .fade-img elements inside it
        image_count = fade_container.locator(".fade-img").count()
        print(f"Number of images for LUMENFALL HOODIE: {image_count}")

        if image_count == 6:
            print("SUCCESS: 6 images found.")
        else:
            print(f"FAILURE: Expected 6 images, found {image_count}.")

        # Take a screenshot of the card
        # Scroll to the element
        fade_container.scroll_into_view_if_needed()
        # Take screenshot of the card (parent of fade container)
        # The fade container is inside .product-card -> .bg-gray-900 -> fade-container
        # We can select the product card containing the text "LUMENFALL HOODIE"
        product_card = page.locator(".product-card").filter(has_text="LUMENFALL HOODIE")
        product_card.screenshot(path="verification/hoodie_card.png")

        browser.close()

if __name__ == "__main__":
    verify_hoodie_images()
