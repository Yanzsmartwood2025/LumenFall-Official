from playwright.sync_api import sync_playwright

def verify_unboxing(page):
    # 1. Go to the Armeria store
    page.goto("http://localhost:8000/Armeria/index.html")

    # 2. Wait for products to load and find Product 5 (My Tempo Bundle)
    # We can click the card that contains "MY TEMPO"
    product_card = page.locator(".product-card").filter(has_text="MY TEMPO")
    product_card.click()

    # 3. Wait for modal to open
    page.wait_for_selector("#product-modal.active")

    # 4. Verify "UNBOXING" button exists
    unboxing_btn = page.get_by_role("button", name="UNBOXING")
    if not unboxing_btn.is_visible():
        print("UNBOXING button not found!")
        return

    # 5. Click UNBOXING button
    unboxing_btn.click()

    # 6. Verify sub-buttons are visible
    box_btn = page.get_by_role("button", name="THE BLACK BOX")
    items_btn = page.get_by_role("button", name="LLAVERO + TARJETA")

    if not box_btn.is_visible() or not items_btn.is_visible():
        print("Sub-buttons not visible!")
        return

    # 7. Take screenshot of "The Black Box" view (default)
    page.wait_for_timeout(1000) # Wait for image fade/load
    page.screenshot(path="verification/unboxing_box.png")

    # 8. Click "LLAVERO + TARJETA" and take screenshot
    items_btn.click()
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/unboxing_items.png")

    # 9. Click "HOMBRE" to verify return to normal state
    page.get_by_role("button", name="HOMBRE").click()
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/return_to_clothing.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_unboxing(page)
        finally:
            browser.close()
