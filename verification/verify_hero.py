from playwright.sync_api import sync_playwright

def verify_hero_slides():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport to verify portrait behavior
        page = browser.new_page(viewport={'width': 390, 'height': 844})

        page.goto("http://localhost:8000/Armeria/index.html")

        # Wait for hero section to be visible
        page.wait_for_selector("#hero-slides")

        # We need to capture slides that have the .hero-calibrated class.
        # Since they fade in/out, we might need to force one to be visible or wait.
        # However, for verification of CSS application, we can just inspect the computed style via screenshot or check elements.

        # Let's take a screenshot of the initial state (Slide 0 is active, contains image)
        page.screenshot(path="verification/slide_0_mobile.png")
        print("Captured Slide 0 (Control)")

        # Now let's try to make Slide 1 active manually to see the calibrated effect
        # Slide 1 has class .hero-calibrated
        page.evaluate("""
            document.querySelectorAll('.hero-slide').forEach(s => s.classList.remove('active'));
            const s1 = document.querySelector('.hero-slide.hero-calibrated');
            if(s1) s1.classList.add('active');
        """)

        # Allow transition (CSS has 1.5s transition) - wait 2s
        page.wait_for_timeout(2000)

        page.screenshot(path="verification/slide_1_mobile_calibrated.png")
        print("Captured Slide 1 (Calibrated) Mobile")

        # Now check Desktop Landscape behavior
        page_desktop = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page_desktop.goto("http://localhost:8000/Armeria/index.html")
        page_desktop.wait_for_selector("#hero-slides")

        # Activate Slide 1
        page_desktop.evaluate("""
            document.querySelectorAll('.hero-slide').forEach(s => s.classList.remove('active'));
            const s1 = document.querySelector('.hero-slide.hero-calibrated');
            if(s1) s1.classList.add('active');
        """)
        page_desktop.wait_for_timeout(2000)
        page_desktop.screenshot(path="verification/slide_1_desktop_calibrated.png")
        print("Captured Slide 1 (Calibrated) Desktop")

        browser.close()

if __name__ == "__main__":
    verify_hero_slides()
