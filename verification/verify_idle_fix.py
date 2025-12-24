
from playwright.sync_api import sync_playwright

def test_check_idle_texture_and_logic():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required",
                "--use-gl=swiftshader"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        # Route Auth
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="window.LumenfallAuth = { currentUser: { uid: 'test-user', displayName: 'Test' }, onAuthStateChanged: (cb) => cb({ uid: 'test-user', displayName: 'Test' }) };"
        ))

        # Navigate to game
        page.goto("file:///app/Lumenfall-juego/index.html")

        # Wait for game to be potentially ready (start button)
        try:
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")
        except Exception as e:
            print(f"Start button not found or error: {e}")


        # Wait for menu (play button)
        try:
            page.wait_for_selector("#play-button", state="visible", timeout=5000)
            page.click("#play-button")
        except Exception as e:
            print(f"Play button not found or error: {e}")

        # Wait a bit for game to initialize
        page.wait_for_timeout(3000)

        # Evaluate window.player state with safer access
        player_info = page.evaluate("""() => {
            if (!window.player) return { error: "Player not found" };
            if (!window.player.idleTexture) return { error: "idleTexture not found" };

            let src = "unknown";
            if (window.player.idleTexture.image && window.player.idleTexture.image.src) {
                src = window.player.idleTexture.image.src;
            } else if (window.player.idleTexture.source && window.player.idleTexture.source.data && window.player.idleTexture.source.data.src) {
                src = window.player.idleTexture.source.data.src;
            }

            return {
                idleSrc: src,
                repeatX: window.player.idleTexture.repeat.x,
                scaleX: window.player.mesh.scale.x,
                scaleY: window.player.mesh.scale.y,
                currentState: window.player.currentState,
                PLAYER_SCALE: 1.35
            };
        }""")

        if 'error' in player_info:
             print(f"Error accessing player info: {player_info['error']}")
             browser.close()
             return

        print(f"Player Info: {player_info}")

        # Check source URL (should contain new filename)
        if "Joziel_Idle_V2.png" in player_info['idleSrc']:
             print("SUCCESS: idleSrc contains Joziel_Idle_V2.png")
        else:
             print(f"FAILURE: idleSrc expected Joziel_Idle_V2.png, got {player_info['idleSrc']}")

        # Check repeat.x (should be 0.18)
        if abs(player_info['repeatX'] - 0.18) < 0.001:
             print("SUCCESS: repeatX is 0.18")
        else:
             print(f"FAILURE: repeatX expected 0.18, got {player_info['repeatX']}")

        # Check Scale (should be PLAYER_SCALE * 0.85 = 1.35 * 0.85 = 1.1475)
        expected_scale = 1.35 * 0.85
        if abs(player_info['scaleX'] - expected_scale) < 0.01:
             print(f"SUCCESS: scaleX is {player_info['scaleX']} (Target ~{expected_scale})")
        else:
             print(f"FAILURE: scaleX expected {expected_scale}, got {player_info['scaleX']}")

        browser.close()

if __name__ == "__main__":
    test_check_idle_texture_and_logic()
