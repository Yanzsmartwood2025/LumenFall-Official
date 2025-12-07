from playwright.sync_api import sync_playwright

def verify_gender_selector():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000/Armeria/index.html")

        # Click on "LUMENFALL GRAPHIC TEE"
        page.get_by_text("LUMENFALL GRAPHIC TEE").first.click()

        # Wait for modal
        page.wait_for_selector("#product-modal.active")

        # Verify Gender Selector exists
        man_btn = page.get_by_role("button", name="HOMBRE")
        woman_btn = page.get_by_role("button", name="MUJER")

        if man_btn.is_visible() and woman_btn.is_visible():
            print("SUCCESS: Gender buttons are visible.")
        else:
            print("FAILURE: Gender buttons not found.")

        # Verify Help Text is present
        help_text = page.locator("#gender-help-text")
        if help_text.is_visible():
            print(f"SUCCESS: Help text visible: {help_text.text_content()}")
        else:
            print("FAILURE: Help text not visible.")

        # Click WOMAN
        woman_btn.click()

        # Take screenshot of the modal with selection
        page.locator("#product-modal").screenshot(path="verification/gender_modal.png")

        browser.close()

if __name__ == "__main__":
    verify_gender_selector()
