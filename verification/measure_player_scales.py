import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = await browser.new_context()
        page = await context.new_page()

        # Mock Auth
        await page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                window.LumenfallAuth = {
                    currentUser: { uid: 'test-user', displayName: 'Tester', photoURL: 'assets/ui/Icono-inicio.png' },
                    onAuthStateChanged: (cb) => cb({ uid: 'test-user', displayName: 'Tester' }, { uid: 'test-user' }),
                    signOut: () => Promise.resolve()
                };
            """
        ))

        # Open page
        cwd = os.getcwd()
        url = f"file://{cwd}/Lumenfall-juego/index.html"
        print(f"Loading {url}...")
        await page.goto(url)

        # Enter Game
        try:
            print("Waiting for Start Button...")
            await page.wait_for_selector("#start-button", state="visible", timeout=10000)
            await page.click("#start-button")
            print("Clicked Start Button.")

            print("Waiting for Play Button...")
            await page.wait_for_selector("#play-button", state="visible", timeout=10000)

            # Wait a bit for menu transition
            await page.wait_for_timeout(1500)

            print("Clicking Play Button...")
            await page.click("#play-button")

            print("Waiting for Player Mesh...")
            await page.wait_for_function("window.player && window.player.mesh", timeout=20000)
        except Exception as e:
            print(f"Error starting game: {e}")
            await page.screenshot(path="error_start.png")
            await browser.close()
            return

        print("Game Loaded.")

        # Helper to get stats
        async def get_player_stats(label):
            return await page.evaluate(f"""() => {{
                const p = window.player;
                if (!p || !p.mesh) return null;
                const mesh = p.mesh;
                const tex = mesh.material.map;
                const src = tex && tex.image ? tex.image.src : 'No Texture';
                const filename = src.split('/').pop().split('?')[0];
                return {{
                    label: "{label}",
                    state: p.currentState,
                    facingLeft: p.isFacingLeft,
                    scale: {{ x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }},
                    texture: filename,
                    imageWidth: tex.image ? tex.image.width : 0,
                    imageHeight: tex.image ? tex.image.height : 0
                }};
            }}""")

        # Get Joystick Position
        joystick_box = await page.locator("#joystick-container").bounding_box()
        if not joystick_box:
            print("Joystick not found!")
            await browser.close()
            return

        jx = joystick_box["x"] + joystick_box["width"] / 2
        jy = joystick_box["y"] + joystick_box["height"] / 2
        radius = joystick_box["width"] / 2

        # 1. IDLE (Right - Default)
        await page.wait_for_timeout(1000)
        stats_idle = await get_player_stats("ESTADO 3: IDLE (Quieto)")
        print(stats_idle)

        # 2. WALK RIGHT
        print("Walking Right...")
        # Drag joystick right
        await page.mouse.move(jx, jy)
        await page.mouse.down()
        await page.mouse.move(jx + radius, jy, steps=5)
        await page.wait_for_timeout(1000) # Walk for 1 sec
        stats_walk = await get_player_stats("ESTADO 1: CAMINAR (Walk Right)")
        print(stats_walk)
        await page.mouse.up()
        await page.wait_for_timeout(1000) # Stop and settle

        # 3. SHOOT LEFT
        print("Shooting Left...")
        # First turn left
        await page.mouse.move(jx, jy)
        await page.mouse.down()
        await page.mouse.move(jx - radius, jy, steps=5) # Left
        await page.wait_for_timeout(200)
        await page.mouse.up() # Release (should stay facing left)
        await page.wait_for_timeout(200)

        # Click Shoot
        await page.locator("#btn-shoot").click()
        await page.wait_for_timeout(100) # During animation
        stats_shoot = await get_player_stats("ESTADO 2: DISPARO IZQUIERDA (Shoot Left)")
        print(stats_shoot)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
