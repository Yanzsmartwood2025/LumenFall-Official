from playwright.sync_api import sync_playwright

def verify_mobile_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile Viewport (iPhone 13 Pro approx: 390x844)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1')
        page = context.new_page()

        print("Navigating to index.html...")
        page.goto("http://localhost:8080/index.html")

        # Bypass splash screen
        page.evaluate("sessionStorage.setItem('splashSeen', 'true')")
        page.reload()

        # Wait for content to stabilize
        page.wait_for_selector("#main-content", state="visible")
        page.wait_for_timeout(1000)

        # 1. Verify Overlay Opacity
        # The selector for the overlay is .bg-black/40 (escaped as .bg-black\/40)
        # We added opacity-0 class.
        overlay = page.locator("#bg-video-container > div.absolute.bg-black\\/40")

        # Check if opacity-0 class is present
        classes = overlay.get_attribute("class")
        opacity_style = page.evaluate("el => getComputedStyle(el).opacity", overlay.element_handle())

        print(f"Overlay Classes: {classes}")
        print(f"Overlay Computed Opacity: {opacity_style}")

        if "opacity-0" in classes and float(opacity_style) == 0:
            print("PASS: Overlay is transparent.")
        else:
            print("FAIL: Overlay is NOT transparent.")

        # 2. Verify Header Padding (Logo Position)
        # The container has pt-[30vh]. 30% of 844 is ~253.2px.
        content_container = page.locator("#main-content > div.flex-grow")
        padding_top = page.evaluate("el => getComputedStyle(el).paddingTop", content_container.element_handle())

        print(f"Container Padding Top: {padding_top}")

        # Parse px value
        pt_px = float(padding_top.replace("px", ""))
        expected_pt = 844 * 0.30

        if abs(pt_px - expected_pt) < 10: # Allow small rounding diff
            print(f"PASS: Padding Top is approx 30vh ({pt_px}px vs expected {expected_pt}px)")
        else:
            print(f"FAIL: Padding Top mismatch. Got {pt_px}px, expected {expected_pt}px")

        # 3. Verify Nav Position
        nav = page.locator("nav")
        nav_box = nav.bounding_box()
        viewport_height = page.viewport_size['height']

        # Check margin-bottom computed
        margin_bottom = page.evaluate("el => getComputedStyle(el).marginBottom", nav.element_handle())
        print(f"Nav Margin Bottom: {margin_bottom}")

        # Check position relative to bottom
        bottom_gap = viewport_height - (nav_box['y'] + nav_box['height'])
        print(f"Nav Bottom Gap (pixels from bottom of screen): {bottom_gap}")

        # The nav should be pushed down.
        # With pb-0 on container and mb-0 on nav, it should be close to footer.
        # However, footer is after nav.
        # <nav> ... </nav>
        # <footer> ... </footer>
        # Footer has p-6 (1.5rem = 24px) padding top/bottom + text height.
        # So Nav should be above Footer.

        footer = page.locator("footer")
        footer_box = footer.bounding_box()

        print(f"Footer Y: {footer_box['y']}")
        print(f"Nav Max Y: {nav_box['y'] + nav_box['height']}")

        if (footer_box['y'] - (nav_box['y'] + nav_box['height'])) < 50: # Arbitrary small gap
             print("PASS: Nav is close to Footer.")
        else:
             print("WARN: Nav seems far from Footer.")

        # 4. Take Screenshot
        page.screenshot(path="verification/mobile_view_final.png")
        print("Screenshot saved to verification/mobile_view_final.png")

        browser.close()

if __name__ == "__main__":
    verify_mobile_layout()
