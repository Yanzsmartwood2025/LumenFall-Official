from playwright.sync_api import sync_playwright

def verify_updates():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the page
        page.goto("http://localhost:8000/Armeria/index.html")
        page.wait_for_selector("#carousel-equipamiento")

        # 1. Verify SHADOW WALKER images
        shadow_walker_card = page.get_by_text("SHADOW WALKER").first
        shadow_walker_card.scroll_into_view_if_needed()
        shadow_walker_card.click()

        page.wait_for_selector("#product-modal.active")
        print("Modal opened for SHADOW WALKER")

        # Check first image (should be white)
        page.wait_for_selector("#modal-main-img")
        src = page.eval_on_selector("#modal-main-img", "el => el.src")
        print(f"Image src: {src}")

        if "Camiseta-sin-mangas-blanca.jpg" in src:
            print("SUCCESS: First image is 'Camiseta-sin-mangas-blanca.jpg'")
        else:
            print(f"FAILURE: First image is {src}")

        page.screenshot(path="verification/shadow_walker.png")

        # Close modal
        page.click("#product-modal .fa-arrow-left")

        # 2. Verify Menu Icon
        # Open menu
        page.click("header button .fa-bars")
        page.wait_for_selector("#side-menu.active")

        # Check logo src
        logo_src = page.eval_on_selector(".side-menu-content img", "el => el.src")
        print(f"Logo src: {logo_src}")

        if "assets/Imagenes/Iconos/Icono_lumenfall.png" in logo_src:
            print("SUCCESS: Logo path is correct")
        else:
            print(f"FAILURE: Logo path is {logo_src}")

        page.screenshot(path="verification/menu_logo.png")

        browser.close()

if __name__ == "__main__":
    verify_updates()
