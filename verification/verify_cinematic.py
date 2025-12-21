from playwright.sync_api import sync_playwright
import time

def verify_cinematic_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock Auth to prevent redirect
        page.add_init_script("""
            window.LumenfallAuth = {
                onStateChanged: (callback) => {
                    console.log("Mock Auth: Logging in...");
                    callback({ displayName: "Test Pilot", email: "test@example.com", photoURL: "" }, {});
                }
            };
        """)

        # Load the game locally
        page.goto("file:///app/Lumenfall-juego/index.html")

        # Handle Start Flow
        try:
            print("Waiting for Start Button...")
            page.wait_for_selector("#start-button", state="visible", timeout=10000)
            page.click("#start-button")
            print("Clicked Start Button.")

            print("Waiting for Play Button...")
            page.wait_for_selector("#play-button", state="visible", timeout=10000)
            # Give time for transition/fade-in
            time.sleep(1)
            page.click("#play-button")
            print("Clicked Play Button.")

            # Wait for game to load
            print("Waiting for Game Canvas...")
            page.wait_for_selector("#bg-canvas", state="visible", timeout=10000)
            time.sleep(3) # Allow initialization and asset loading

            # Inject code to trigger the cinematic event manually
            print("Triggering First Flame Event...")
            page.evaluate("window.triggerFirstFlameEvent()")

            # Allow frame update
            time.sleep(0.5)

            # Check if the door prompt is hidden
            display_style = page.evaluate("document.getElementById(\"door-prompt-flame\").style.display")
            print(f"Door Prompt Display Style: {display_style}")

            page.screenshot(path="verification/cinematic_fix.png")

            if display_style == "none":
                print("SUCCESS: Door prompt is hidden.")
            else:
                print(f"FAILURE: Door prompt is visible (style={display_style}).")
                exit(1)

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification/error_state.png")
            exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_cinematic_fix()
