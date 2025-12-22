
import time
from playwright.sync_api import sync_playwright

def verify_projectile():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required",
                "--use-gl=swiftshader"
            ]
        )
        # Create context with permissions if needed (though args handle autoplay usually)
        context = browser.new_context()
        page = context.new_page()

        # 1. Load Game
        print("Loading game...")
        page.goto("file:///app/Lumenfall-juego/index.html")

        # 2. Handle Intro
        print("Clicking Start Button...")
        page.wait_for_selector("#start-button", state="visible")
        page.click("#start-button")

        print("Waiting for Play Button...")
        page.wait_for_selector("#play-button", state="visible", timeout=5000)

        # 3. Start Game
        print("Clicking Play Button...")
        page.click("#play-button")

        # 4. Wait for Player
        print("Waiting for game to initialize...")
        # Check if window.player is defined
        page.wait_for_function("() => window.player !== undefined")

        # Wait a bit for level load
        time.sleep(2)

        # 5. Inject Logic to Shoot
        print("Shooting projectile...")
        page.evaluate("""
            window.player.power = 100;
            window.player.shootCooldown = 0;
            window.player.shoot({x: 1, y: 0});
        """)

        # 6. Verify SPAWN State (approx 100ms later)
        time.sleep(0.1)

        # Check properties
        proj_data = page.evaluate("""
            () => {
                if (window.allProjectiles.length === 0) return null;
                const p = window.allProjectiles[0];
                return {
                    state: p.state,
                    scaleX: p.mesh.scale.x,
                    uvOffsetY: p.texture.offset.y
                };
            }
        """)
        print(f"Projectile Data at 100ms: {proj_data}")

        page.screenshot(path="verification/projectile_spawn.png")

        # 7. Verify FLIGHT State (approx 300ms later)
        time.sleep(0.3)

        proj_data_flight = page.evaluate("""
            () => {
                if (window.allProjectiles.length === 0) return null;
                const p = window.allProjectiles[0];
                return {
                    state: p.state,
                    scaleX: p.mesh.scale.x,
                    uvOffsetY: p.texture.offset.y
                };
            }
        """)
        print(f"Projectile Data at 400ms: {proj_data_flight}")

        page.screenshot(path="verification/projectile_flight.png")

        browser.close()

if __name__ == "__main__":
    verify_projectile()
