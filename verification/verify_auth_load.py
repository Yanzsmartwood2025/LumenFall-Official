from playwright.sync_api import sync_playwright

def verify_auth_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use valid permissions to avoid audio issues if possible, though not strictly needed for auth check
        context = browser.new_context()
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(msg.text))

        try:
            print("Navigating to Lumenfall-juego...")
            page.goto("http://localhost:8080/Lumenfall-juego/index.html")

            # Wait for the start button to ensure page loaded
            page.wait_for_selector("#start-button", state="visible", timeout=10000)
            print("Game page loaded.")

            # Check for the specific success message from auth-core.js
            expected_msg = "⚡ Lumenfall System: Main Breaker Active (Firebase Init)."

            # Give a moment for the module to execute
            page.wait_for_timeout(2000)

            found_auth = False
            for log in console_logs:
                if expected_msg in log:
                    found_auth = True
                    break

            if found_auth:
                print("SUCCESS: Auth core initialized correctly.")
            else:
                print("WARNING: Auth core message not found in console logs.")
                print("Logs:", console_logs)

            # Take screenshot
            screenshot_path = "/app/verification/auth_verification.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_auth_load()
