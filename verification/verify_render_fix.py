from playwright.sync_api import sync_playwright

def verify_player_render():
    with sync_playwright() as p:
        # Launch browser with required args for WebGL
        browser = p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
        )
        context = browser.new_context()
        page = context.new_page()

        # Load game
        print("Loading game...")
        page.goto("file:///app/Lumenfall-juego/index.html")

        # Bypass auth
        print("Injecting Auth...")
        page.evaluate("""
            window.LumenfallAuth = {
                onAuthStateChanged: (cb) => cb({ uid: 'tester', displayName: 'Tester' }),
                currentUser: { uid: 'tester' }
            };
        """)

        # Wait for game initialization
        page.wait_for_timeout(2000)

        # Start game (click Start then Play)
        print("Starting game interaction...")
        try:
            # Click splash screen
            page.click('#start-button', timeout=5000)
            page.wait_for_timeout(1500)

            # Click Play button
            page.click('#play-button', timeout=5000)
            page.wait_for_timeout(3000) # Wait for level load
        except Exception as e:
            print(f"Interaction error: {e}")
            page.screenshot(path="verification/error_interaction.png")

        # Inspect Player State via Console
        print("Inspecting player state...")
        try:
            player_data = page.evaluate("""() => {
                if (!window.player || !window.player.mesh) return null;
                const tex = window.player.mesh.material.map;
                return {
                    y: window.player.mesh.position.y,
                    scaleX: window.player.mesh.scale.x,
                    scaleY: window.player.mesh.scale.y,
                    filterMag: tex ? tex.magFilter : null,
                    filterMin: tex ? tex.minFilter : null,
                    nearestFilterConstant: 1003 // THREE.NearestFilter
                };
            }""")

            print(f"Player Data: {player_data}")

            # Validation Logic
            if player_data:
                is_y_correct = abs(player_data['y'] - 0.8) < 0.01
                is_scale_correct = abs(player_data['scaleX'] - 1.35) < 0.01
                is_filter_correct = (player_data['filterMag'] == 1003) and (player_data['filterMin'] == 1003)

                print(f"Position Y Correct (0.8): {is_y_correct}")
                print(f"Scale Correct (1.35): {is_scale_correct}")
                print(f"Filter Correct (Nearest): {is_filter_correct}")
            else:
                print("Player not found in window object")

        except Exception as e:
            print(f"Evaluation error: {e}")

        # Screenshot for visual check
        print("Taking screenshot...")
        page.screenshot(path="verification/verify_render_fix.png")
        browser.close()

if __name__ == "__main__":
    verify_player_render()
