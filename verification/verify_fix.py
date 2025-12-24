
import os
import sys
from playwright.sync_api import sync_playwright

def verify_hud_and_black_screen():
    with sync_playwright() as p:
        # Launch browser with required args for WebGL
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

        # Capture ALL logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        # Load the page
        file_path = os.path.abspath("Lumenfall-juego/index.html")
        page.goto(f"file://{file_path}")

        # Wait for splash screen click
        try:
            # We need to click start button to initialize audio and see the game menu
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")

            # Wait for menu screen to appear
            page.wait_for_selector("#menu-screen", state="visible", timeout=5000)

            # Take screenshot of menu (to check if intro worked)
            page.screenshot(path="verification/menu_screen.png")
            print("Menu screen captured.")

            # Click PLAY to start game
            page.click("#play-button")

            # Wait for game to initialize (canvas visible, ui-container visible)
            page.wait_for_selector("#bg-canvas", state="visible", timeout=10000)
            page.wait_for_selector("#ui-container", state="visible", timeout=10000)

            # Additional wait to let the fade-in complete and 3D scene render
            page.wait_for_timeout(3000)

            # --- VERIFICATION 1: CHECK FOR BLACK SCREEN (JS ERROR) ---
            # If JS crashed, the game loop wouldn't start or UI wouldn't show.
            # We check if 'window.player' is defined as a proxy for successful init
            player_exists = page.evaluate("typeof window.player !== 'undefined'")
            print(f"Player object exists: {player_exists}")

            # --- VERIFICATION 2: CHECK SPECTRAL BAR POSITION ---
            # We'll take a screenshot of the UI
            page.screenshot(path="verification/game_hud.png")
            print("Game HUD captured.")

            # Inspect the computed style of #spectral-bar
            spectral_bar_style = page.evaluate("""() => {
                const el = document.getElementById('spectral-bar');
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return {
                    top: style.top,
                    right: style.right,
                    width: style.width,
                    height: style.height,
                    position: style.position,
                    rect: {x: rect.x, y: rect.y, width: rect.width, height: rect.height}
                };
            }""")

            print(f"Spectral Bar Style: {spectral_bar_style}")

            # --- VERIFICATION 3: SPAWN LOOT & HUD PROJECTILE ---
            if player_exists:
                # Inject a spawn command
                # Pass player.mesh.parent (scene) to spawnLoot
                page.evaluate("spawnLoot(window.player.mesh.parent, window.player.mesh.position.x + 2, window.player.mesh.position.y + 2, 0)")
                print("Spawned loot via console injection.")

                page.wait_for_timeout(500)
                page.screenshot(path="verification/loot_spawned.png")

                # Let's manually trigger HUDProjectile
                page.evaluate("new HUDProjectile(window.player.mesh.parent, new THREE.Vector3(0, 0, 0), 'soul')")
                print("Triggered HUDProjectile manually.")

                page.wait_for_timeout(500) # Wait for animation
                page.screenshot(path="verification/projectile_anim.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_state.png")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_hud_and_black_screen()
