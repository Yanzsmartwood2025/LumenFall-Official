from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load the page
        page.goto("http://localhost:8000/Armeria/index.html")
        page.wait_for_load_state("networkidle")

        print("Page loaded.")

        # 2. Verify Translations (Header & Hero)
        # Check Main Title
        main_title = page.locator('[data-i18n="mainTitle"]')
        print(f"Main Title (ES): {main_title.inner_text()}")
        assert main_title.inner_text() == "LA ARMERÍA"

        # Check Hero Title
        hero_title = page.locator('[data-i18n="heroTitle"]')
        print(f"Hero Title (ES): {hero_title.inner_text()}")
        assert hero_title.inner_text() == "EL CAOS TANGIBLE"

        # Check Hero Subtitle
        hero_subtitle = page.locator('[data-i18n="heroSubtitle"]')
        print(f"Hero Subtitle (ES): {hero_subtitle.inner_text()}")
        assert hero_subtitle.inner_text() == "EQUIPAMIENTO & LORE"

        # 3. Switch Language to English
        print("Switching to English...")
        page.evaluate("setLanguage('en')")

        # Verify Translations in English
        print(f"Main Title (EN): {main_title.inner_text()}")
        assert main_title.inner_text() == "THE ARMORY"

        print(f"Hero Title (EN): {hero_title.inner_text()}")
        assert hero_title.inner_text() == "TANGIBLE CHAOS"

        print(f"Hero Subtitle (EN): {hero_subtitle.inner_text()}")
        assert hero_subtitle.inner_text() == "EQUIPMENT & LORE"

        # 4. Verify Pre-Order Button Text (Product 7 - Notebook)
        print("Opening Pre-Order Product (Notebook)...")
        # Ensure we are in English
        # Open Product 7 (The Agent Notebook)
        page.evaluate("openProduct(7)")
        page.wait_for_selector("#product-modal.active")

        add_btn = page.locator("#add-to-cart-btn span")
        print(f"Pre-Order Button (EN): {add_btn.inner_text()}")
        assert add_btn.inner_text() == "PRE-ORDER"

        # Close Modal
        page.evaluate("closeProduct()")
        page.wait_for_selector("#product-modal.active", state="hidden")

        # Switch back to Spanish
        print("Switching to Spanish...")
        page.evaluate("setLanguage('es')")

        # Open Product 7 again
        page.evaluate("openProduct(7)")
        page.wait_for_selector("#product-modal.active")
        print(f"Pre-Order Button (ES): {add_btn.inner_text()}")
        assert add_btn.inner_text() == "RESERVAR"

        # 5. Verify Artifact in Cart Image
        # Add to cart (Product 7 is already open)
        print("Adding Artifact to Cart...")
        page.locator("#add-to-cart-btn").click()

        # Wait for cart modal
        # Note: addToCartCurrent closes product modal but doesn't auto-open cart modal in original code?
        # Let's check logic: "updateCartBadge(); closeProduct(); const btn = ... border..."
        # It doesn't open cart. We need to open cart manually.
        page.evaluate("closeProduct()") # Ensure closed
        page.evaluate("toggleCart()")
        page.wait_for_selector("#cart-modal.active")

        # Check for image in cart list
        # The list is #cart-list. It should contain an img tag if successful.
        cart_list = page.locator("#cart-list")
        cart_images = cart_list.locator("img")
        count = cart_images.count()
        print(f"Images in cart: {count}")

        if count > 0:
            src = cart_images.first.get_attribute("src")
            print(f"Artifact Image Source: {src}")
            assert "Cuaderno-1.jpg" in src or "Accesorios" in src
        else:
            print("ERROR: No image found for artifact in cart!")
            # Take screenshot for debugging
            page.screenshot(path="verification/cart_failure.png")
            raise Exception("Artifact image missing in cart")

        # Take success screenshot
        page.screenshot(path="verification/success.png")
        print("Verification Successful. Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_changes()
