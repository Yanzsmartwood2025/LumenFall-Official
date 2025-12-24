from playwright.sync_api import sync_playwright

def verify_buttons():
    with sync_playwright() as p:
        # Launch browser (headless for speed)
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Load the game page (direct file access)
        # Note: We are using absolute path for the file based on the repo structure
        # Assuming repo root is current working directory
        import os
        cwd = os.getcwd()
        file_url = f"file://{cwd}/Lumenfall-juego/index.html"

        print(f"Loading: {file_url}")
        page.goto(file_url)

        # Inject a mock user to bypass the redirect
        page.evaluate("""
            window.LumenfallAuth = {
                onStateChanged: (callback) => {
                    callback({ displayName: 'Test Pilot', email: 'test@example.com' }, {});
                },
                currentUser: { displayName: 'Test Pilot' }
            };
        """)

        # Wait for the Start button and click it to enter the main menu
        try:
            # Wait for splash screen start button
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")

            # Wait for main menu play button
            page.wait_for_selector("#play-button", state="visible", timeout=5000)
            page.click("#play-button")

            # Now we are in the game UI.
            # We need to wait for the UI container to be visible
            page.wait_for_selector("#ui-container", state="attached", timeout=5000)

            # Locate the buttons we changed
            shoot_btn = page.locator("#btn-shoot")
            attack_btn = page.locator("#btn-attack")

            # Take a screenshot of the controls area specifically
            controls = page.locator("#controls")

            # Wait a moment for animations (flame ring rotation) to start
            page.wait_for_timeout(1000)

            output_path = f"{cwd}/verification/fire_buttons_verified.png"
            controls.screenshot(path=output_path)
            print(f"Screenshot saved to {output_path}")

        except Exception as e:
            print(f"Error during verification: {e}")
            # Fallback full page screenshot
            page.screenshot(path=f"{cwd}/verification/error_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_buttons()
