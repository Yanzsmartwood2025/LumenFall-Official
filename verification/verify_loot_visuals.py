from playwright.sync_api import sync_playwright
import os
import time

def verify_loot_visuals():
    with sync_playwright() as p:
        # Launch browser with arguments to enable WebGL and Autoplay
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        # Create context without granting permissions (as per memory instruction)
        context = browser.new_context()
        page = context.new_page()

        # Intercept auth-core.js to mock authentication
        def handle_auth_core(route):
            mock_auth_script = """
            window.LumenfallAuth = {
                loginWithGoogle: () => console.log('Mock login'),
                loginWithGithub: () => console.log('Mock login'),
                sendMagicLink: () => console.log('Mock email'),
                finishMagicLinkSignIn: () => console.log('Mock finish'),
                signOut: () => console.log('Mock signout'),
                onStateChanged: (callback) => {
                    // Simulate logged in user
                    callback({
                        uid: 'test-user-123',
                        displayName: 'Test User',
                        photoURL: 'assets/imagenes/icono-joziel-2.png' // Use local asset
                    }, {
                        uid: 'test-user-123',
                        displayName: 'Test User',
                        photoURL: 'assets/imagenes/icono-joziel-2.png'
                    });
                },
                currentUser: {
                    uid: 'test-user-123',
                    displayName: 'Test User',
                    photoURL: 'assets/imagenes/icono-joziel-2.png'
                }
            };
            // Also inject currentUserData for Nightmare mode logic if needed
            window.currentUserData = window.LumenfallAuth.currentUser;
            """
            route.fulfill(status=200, content_type="application/javascript", body=mock_auth_script)

        page.route("**/auth-core.js", handle_auth_core)

        # Go to the game page
        # Assuming current working directory is root, so relative path
        url = "file://" + os.path.abspath("Lumenfall-juego/index.html")
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for Start Button
        print("Waiting for #start-button...")
        page.wait_for_selector("#start-button", state="visible")

        # Click Start Button
        print("Clicking Start...")
        page.click("#start-button")

        # Wait for Play Button (Main Menu)
        print("Waiting for #play-button...")
        # Note: The fade in takes 1s + 1.1s fallback in code.
        # Wait extra time to be safe
        page.wait_for_selector("#play-button", state="visible", timeout=10000)

        # Click Play Button to start game
        print("Clicking Play...")
        page.click("#play-button")

        # Wait for Game Canvas to be active and Level to load
        print("Waiting for game loop...")
        # We can wait for the canvas
        page.wait_for_selector("#bg-canvas", state="visible")

        # Wait a few seconds for 'dungeon_1' to init and loot to spawn
        time.sleep(3)

        # Check if items exist in global variables
        item_count = page.evaluate("window.allPowerUps ? window.allPowerUps.length : 0")
        print(f"Loot items detected: {item_count}")

        if item_count >= 3:
            print("Success: Loot items detected in memory.")
        else:
            print("Warning: Less than 3 loot items detected.")

        # Take Screenshot
        screenshot_path = "verification/loot_visuals.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_loot_visuals()
