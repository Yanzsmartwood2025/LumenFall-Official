
import time
from playwright.sync_api import sync_playwright

def verify_soul_system():
    with sync_playwright() as p:
        # Launch browser with required args for WebGL
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
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            device_scale_factor=1
        )

        # Grant permissions
        context.grant_permissions(['clipboard-read', 'clipboard-write', 'accelerometer', 'gyroscope', 'magnetometer'])

        page = context.new_page()

        # Intercept Auth
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                export const onAuthStateChanged = (cb) => cb({
                    uid: 'test-user',
                    email: 'test@example.com',
                    displayName: 'Test Pilot'
                }, { roles: ['user'] });
                export const getAuth = () => ({});
                export const initializeApp = () => ({});
                export const getFirestore = () => ({});
                export const getAnalytics = () => ({});
                window.LumenfallAuth = {
                    currentUser: { uid: 'test-user' },
                    userData: { roles: ['user'] },
                    onStateChanged: (cb) => cb({ uid: 'test-user' }, { roles: ['user'] })
                };
            """
        ))

        print("Navigating to game...")
        page.goto("file:///app/Lumenfall-juego/index.html")

        # Bypass Intro
        print("Clicking Start...")
        try:
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")
        except Exception as e:
            print(f"Start button issue: {e}")

        # Wait for Menu & Click Play
        print("Waiting for Play button...")
        try:
            page.wait_for_selector("#play-button", state="visible", timeout=5000)
            time.sleep(1) # Let animations settle
            page.click("#play-button")
        except Exception as e:
            print(f"Play button issue: {e}")

        # Wait for Game Load
        print("Waiting for game load...")
        time.sleep(5)

        # Inject Debug Code to Test Soul System
        print("Injecting Test Logic...")
        page.evaluate("""
            window.testSoulSystem = () => {
                // Ensure player exists
                if (!window.player) return "No Player";

                // 1. Add 50 Souls
                window.player.addSouls(50);

                // 2. Wait and Add 60 Souls (Trigger Overflow)
                setTimeout(() => {
                    window.player.addSouls(60);
                }, 500);
            };
            window.testSoulSystem();
        """)

        time.sleep(0.2)
        print("Capturing 50% fill state...")
        page.screenshot(path="/app/verification/soul_system_50.png")

        time.sleep(1.0)
        print("Capturing Overflow/Charge state...")
        page.screenshot(path="/app/verification/soul_system_charge.png")

        # Get Values
        souls = page.evaluate("window.player.currentSouls")
        charges = page.evaluate("window.player.soulCharges")

        print(f"Current Souls: {souls}")
        print(f"Soul Charges: {charges}")

        browser.close()

if __name__ == "__main__":
    verify_soul_system()
