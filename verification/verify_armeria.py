import re
from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to capture desktop-like layout in landscape
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            print("Navigating to Armeria...")
            page.goto("http://localhost:8000/Armeria/index.html")

            # Wait for initial load
            page.wait_for_selector("#hero-slides")

            # --- HERO VERIFICATION ---
            print("Verifying Hero slides...")
            # We want to check slides 3 and 4 (indices 3 and 4, since 0-based)
            # These correspond to the 4th and 5th .hero-slide divs

            # Force active class on Slide 3 (New Llavero/Camiseta image)
            page.evaluate("document.querySelectorAll('.hero-slide').forEach(s => s.classList.remove('active'))")
            page.evaluate("document.querySelectorAll('.hero-slide')[3].classList.add('active')")
            time.sleep(1) # Wait for transition
            page.screenshot(path="verification/hero_slide_3.png")
            print("Screenshot hero_slide_3.png captured")

            # Force active class on Slide 4 (New Llavero/Camiseta image)
            page.evaluate("document.querySelectorAll('.hero-slide').forEach(s => s.classList.remove('active'))")
            page.evaluate("document.querySelectorAll('.hero-slide')[4].classList.add('active')")
            time.sleep(1)
            page.screenshot(path="verification/hero_slide_4.png")
            print("Screenshot hero_slide_4.png captured")

            # Force active class on Slide 5 (Should be the Book/Libro - old slide 3)
            page.evaluate("document.querySelectorAll('.hero-slide').forEach(s => s.classList.remove('active'))")
            page.evaluate("document.querySelectorAll('.hero-slide')[5].classList.add('active')")
            time.sleep(1)
            page.screenshot(path="verification/hero_slide_5.png")
            print("Screenshot hero_slide_5.png captured")


            # --- ACCESSORIES VERIFICATION ---
            print("Verifying Accessories...")
            # Scroll down to accessories
            page.evaluate("document.getElementById('carousel-artefactos').scrollIntoView()")
            time.sleep(1)

            # There should be 3 items in the artifacts carousel: Llavero(6), Cuaderno(7), Libro(8)
            # We will click each one and take a screenshot of the modal to verify the image loads

            # Product 6: Llavero
            print("Checking Product 6 (Llavero)...")
            # Find product card with text "Llavero Rúnico"
            page.locator(".product-card").filter(has_text="Llavero Rúnico").click()
            # Wait for modal active
            expect(page.locator("#product-modal")).to_have_class(re.compile("active"))
            time.sleep(1)
            page.screenshot(path="verification/product_6_modal.png")
            # Close modal
            page.locator("button[onclick='closeProduct()']").click()
            time.sleep(0.5)

            # Product 7: Cuaderno
            print("Checking Product 7 (Cuaderno)...")
            page.locator(".product-card").filter(has_text="BITÁCORA DEL CAOS").click()
            expect(page.locator("#product-modal")).to_have_class(re.compile("active"))
            time.sleep(1)
            page.screenshot(path="verification/product_7_modal.png")
            page.locator("button[onclick='closeProduct()']").click()
            time.sleep(0.5)

            # Product 8: Libro
            print("Checking Product 8 (Libro)...")
            page.locator(".product-card").filter(has_text="EL GRIMORIO").click()
            expect(page.locator("#product-modal")).to_have_class(re.compile("active"))
            time.sleep(1)
            page.screenshot(path="verification/product_8_modal.png")
            page.locator("button[onclick='closeProduct()']").click()
            time.sleep(0.5)

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
