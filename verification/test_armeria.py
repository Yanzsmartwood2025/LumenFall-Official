from playwright.sync_api import sync_playwright, expect
import time
import re

def verify_armeria(page):
    page.goto("http://localhost:8000/Armeria/index.html")

    # 1. Verify Artifacts Section has the new names
    page.evaluate("document.getElementById('carousel-artefactos').scrollIntoView()")
    time.sleep(1)
    page.screenshot(path="verification/artifacts_carousel.png")
    print("Screenshot of artifacts carousel taken.")

    # 2. Open THE AGENT NOTEBOOK (Product 7)
    page.get_by_text("THE AGENT NOTEBOOK").click()

    # Wait for modal active class
    expect(page.locator("#product-modal")).to_have_class(re.compile(r"active"))
    time.sleep(0.5)

    # Verify Button Text
    add_btn = page.locator("#add-to-cart-btn")
    expect(add_btn).to_contain_text("RESERVAR / PRE-ORDER")

    # Verify Description contains warning
    desc = page.locator("#m-desc")
    expect(desc).to_contain_text("AVISO: PRE-ORDEN")

    page.screenshot(path="verification/notebook_modal.png")
    print("Screenshot of Notebook modal taken.")

    # Add to Cart
    add_btn.click()

    # Verify Cart Modal opens
    expect(page.locator("#product-modal")).not_to_have_class(re.compile(r"active"))

    page.locator("#cart-btn").click()
    expect(page.locator("#cart-modal")).to_have_class(re.compile(r"active"))

    page.screenshot(path="verification/cart_view.png")
    print("Screenshot of Cart taken.")

    # Close Cart
    page.locator("#cart-modal button .fa-xmark").click()

    # 3. Open JOZIEL OPERATIVE TOKEN (Product 6)
    page.get_by_text("JOZIEL OPERATIVE TOKEN").click()
    expect(page.locator("#product-modal")).to_have_class(re.compile(r"active"))

    # Verify Button Text is Standard "AGREGAR"
    add_btn = page.locator("#add-to-cart-btn")
    expect(add_btn).to_contain_text("AGREGAR")

    page.screenshot(path="verification/keychain_modal.png")
    print("Screenshot of Keychain modal taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_armeria(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
