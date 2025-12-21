from playwright.sync_api import sync_playwright

def verify_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Device scale factor ensures 1280x720 rendering is closer to typical laptop
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Go to local server
        page.goto("http://localhost:8080/index.html")

        # Wait for splash screen to fade (max 4.5s) or main content to appear
        # The main content has id "main-content" and transitions opacity
        # We wait for it to be fully visible (opacity 1) roughly

        # Override session storage to skip splash if possible (harder in python after goto)
        # Just wait it out
        page.wait_for_selector("#main-content", state="visible")
        # Splash takes 4s to start fade out, then 0.5s fade out.
        # Let's wait 5 seconds just to be safe so the video and UI are stable
        page.wait_for_timeout(5000)

        # Take screenshot of the full viewport
        page.screenshot(path="verification/layout_check.png")

        # Also print some computed styles for logic verification
        overlay_opacity = page.evaluate("getComputedStyle(document.querySelector('.bg-black\\\\/40')).backgroundColor")
        print(f"Overlay Color (check alpha): {overlay_opacity}") # Should be rgba(0, 0, 0, 0.4)

        # Check nav top position relative to viewport height to confirm it is low
        nav_box = page.locator("nav").bounding_box()
        viewport_height = page.viewport_size['height']
        print(f"Nav Top: {nav_box['y']}, Viewport Height: {viewport_height}")

        if nav_box['y'] > (viewport_height * 0.5):
            print("PASS: Nav is in lower half")
        else:
            print("FAIL: Nav is too high")

        browser.close()

if __name__ == "__main__":
    verify_layout()
