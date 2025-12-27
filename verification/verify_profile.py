
import os
from playwright.sync_api import sync_playwright

def verify_profile_image():
    with sync_playwright() as p:
        # Launch with required args for WebGL/Audio
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required",
                "--use-gl=swiftshader"
            ]
        )
        # Create context without granting permissions explicitly if it causes issues
        context = browser.new_context()
        page = context.new_page()

        # Mock Auth to prevent redirect
        page.add_init_script("""
            window.LumenfallAuth = {
                onStateChanged: (cb) => {
                    console.log("Mock Auth: Logging in...");
                    cb({
                        displayName: "Tester",
                        email: "test@example.com",
                        photoURL: "assets/ui/hud/UI_HUD_Portrait_Player_Circle.png"
                    }, {});
                }
            };
        """)

        # Get absolute path
        cwd = os.getcwd()
        file_path = f"file://{cwd}/Lumenfall-juego/index.html"

        print(f"Navigating to: {file_path}")
        page.goto(file_path)

        # Wait for Start Button
        print("Waiting for Start button...")
        start_btn = page.locator("#start-button")
        start_btn.wait_for(state="visible", timeout=10000)
        start_btn.click()

        # Wait for Play Button (Menu)
        print("Waiting for Play button...")
        play_btn = page.locator("#play-button")
        play_btn.wait_for(state="visible", timeout=10000)

        # Click Play
        play_btn.click()

        # Wait for HUD to appear
        print("Waiting for HUD...")
        profile_img = page.locator("#player-profile-image")
        profile_img.wait_for(state="visible", timeout=20000)

        # Wait a bit for any transitions
        page.wait_for_timeout(2000)

        # Take screenshot of the UI Top area
        print("Taking screenshot...")
        page.locator("#ui-top").screenshot(path="verification/profile_check.png")

        # Also take a zoomed screenshot of the container specifically
        page.locator("#player-profile-container").screenshot(path="verification/profile_zoom.png")

        print("Verification complete.")
        browser.close()

if __name__ == "__main__":
    try:
        verify_profile_image()
    except Exception as e:
        print(f"Error: {e}")
