import time
from playwright.sync_api import sync_playwright

def verify_visual_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required",
                "--use-gl=swiftshader"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        # Mock Authentication
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body='''
                window.LumenfallAuth = {
                    onStateChanged: (cb) => cb({ uid: "test-user", displayName: "Tester", photoURL: "assets/imagenes/icono-joziel-2.png" }),
                    currentUser: { uid: "test-user" },
                    userData: { displayName: "Tester" }
                };
                window.currentUserData = { displayName: "Tester", photoURL: "assets/imagenes/icono-joziel-2.png" };
            '''
        ))

        page.goto("file:///app/Lumenfall-juego/index.html")

        # 1. Bypass Splash Screen
        try:
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")
            print("Clicked Splash Screen Start Button")
        except Exception as e:
            print(f"Splash screen error: {e}")

        # 2. Click Play Button (Main Menu)
        try:
            page.wait_for_selector("#play-button", state="visible", timeout=5000)
            # Short wait for fade-in
            time.sleep(1)
            page.click("#play-button")
            print("Clicked Play Button")
        except Exception as e:
            print(f"Play button error: {e}")

        # 3. Wait for Player
        page.wait_for_function("() => window.player && window.player.mesh")
        print("Player initialized")

        # --- VERIFICATION CHECKS ---

        # A. Room Depth (Global Variable)
        room_depth = page.evaluate("() => roomDepth")
        print(f"Room Depth: {room_depth}")
        if room_depth != 19:
            print("FAIL: Room Depth is not 19")
        else:
            print("PASS: Room Depth is 19")

        # B. Idle Texture Grid (5x2)
        idle_repeat = page.evaluate("() => window.player.idleTexture.repeat")
        print(f"Idle Texture Repeat: {idle_repeat}")
        if abs(idle_repeat['x'] - 0.2) < 0.001 and abs(idle_repeat['y'] - 0.5) < 0.001:
            print("PASS: Idle Texture Repeat is (0.2, 0.5)")
        else:
            print(f"FAIL: Idle Texture Repeat mismatch")

        # C. Floor Position (-0.2)
        pos_y = page.evaluate("() => window.player.mesh.position.y")
        print(f"Player Y Position: {pos_y}")
        if abs(pos_y - (-0.2)) < 0.001:
            print("PASS: Player Y is -0.2")
        else:
            print("FAIL: Player Y mismatch")

        pos_z = page.evaluate("() => window.player.mesh.position.z")
        print(f"Player Z Position: {pos_z}")
        if abs(pos_z - 0) < 0.001:
            print("PASS: Player Z is 0")
        else:
            print("FAIL: Player Z mismatch")

        # D. Left Attack Scale (1.7)
        # Force state to shooting left
        page.evaluate('''() => {
            window.player.isFacingLeft = true;
            window.player.shoot({x: -1, y: 0});
        }''')

        # Wait a frame for update loop to process scale
        time.sleep(0.1)

        scale_x = page.evaluate("() => window.player.mesh.scale.x")
        scale_y = page.evaluate("() => window.player.mesh.scale.y")

        # Expected: 1.15 * 1.7 = 1.955
        expected_scale = 1.15 * 1.7
        print(f"Left Attack Scale X: {scale_x}, Expected: ~{expected_scale}")

        if abs(scale_x - expected_scale) < 0.01:
            print("PASS: Left Attack Scale is Correct")
        else:
            print("FAIL: Left Attack Scale mismatch")

        # Screenshot
        page.screenshot(path="verification/visual_check.png")
        print("Screenshot saved to verification/visual_check.png")

        browser.close()

if __name__ == "__main__":
    verify_visual_changes()
