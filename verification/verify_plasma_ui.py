from playwright.sync_api import sync_playwright
import time
import os

def check_plasma_ui():
    with sync_playwright() as p:
        # Use specific args for WebGL support in this environment
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--ignore-certificate-errors",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        # Create context without granting permissions that might fail
        context = browser.new_context()
        page = context.new_page()

        # Intercept Auth Core to bypass login
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                export const LumenfallAuth = {
                    onStateChanged: (callback) => {
                        callback({
                            email: 'pilot@lumenfall.com',
                            displayName: 'Pilot Zero',
                            photoURL: 'assets/ui/barra-de-energia.png'
                        }, {});
                    },
                    currentUser: { email: 'pilot@lumenfall.com' }
                };
                window.LumenfallAuth = LumenfallAuth;
            """
        ))

        # Determine absolute path for file:// protocol
        cwd = os.getcwd()
        url = f"file://{cwd}/Lumenfall-juego/index.html"
        print(f"Navigating to: {url}")

        page.goto(url)

        # Click Start Button to enter menu
        print("Clicking Start Button...")
        try:
            page.click("#start-button", timeout=5000)
        except Exception as e:
            print(f"Start button click failed: {e}")

        # Wait for menu (Play Button)
        print("Waiting for Play Button...")
        try:
            page.wait_for_selector("#play-button", state="visible", timeout=5000)
            # Click Play to enter game
            page.click("#play-button")
        except Exception as e:
            print(f"Play button interaction failed: {e}")

        # Wait for Game UI to appear
        print("Waiting for Game UI...")
        page.wait_for_selector("#ui-container", state="visible", timeout=10000)

        # Give time for initialization
        time.sleep(2)

        # 1. VERIFY PLASMA CLASSES
        print("Verifying Plasma Classes...")
        energy_classes = page.evaluate("document.getElementById('energy-fill').className")
        power_classes = page.evaluate("document.getElementById('power-fill').className")
        spectral_classes = page.evaluate("document.getElementById('spectral-fill').className")

        print(f"Energy Classes: {energy_classes}")
        print(f"Power Classes: {power_classes}")
        print(f"Spectral Classes: {spectral_classes}")

        # 2. TRIGGER SWELL EFFECT (Simulate restore)
        print("Triggering Swell Effect...")
        page.evaluate("window.player.restorePower(10)")
        time.sleep(0.1) # Capture mid-animation

        # Check if swell class is active on container
        power_bar_classes = page.evaluate("document.getElementById('power-bar').className")
        print(f"Power Bar Classes (Active Swell): {power_bar_classes}")

        # 3. TRIGGER CRITICAL HEALTH (Red Plasma)
        print("Triggering Critical Health...")
        page.evaluate("window.player.health = 10; window.player.checkHealthStatus();")
        time.sleep(0.5)
        energy_classes_crit = page.evaluate("document.getElementById('energy-fill').className")
        print(f"Energy Classes (Critical): {energy_classes_crit}")

        # Screenshot 1: Normal Gameplay with Plasma Bars
        page.screenshot(path="verification/plasma_ui.png")
        print("Screenshot saved: verification/plasma_ui.png")

        # Screenshot 2: Critical State
        page.screenshot(path="verification/plasma_ui_critical.png")
        print("Screenshot saved: verification/plasma_ui_critical.png")

        browser.close()

if __name__ == "__main__":
    check_plasma_ui()
