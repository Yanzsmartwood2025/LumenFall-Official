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
            await page.wait_for_selector("#start-button", state="visible", timeout=10000)
            await page.click("#start-button")
            await page.wait_for_selector("#play-button", state="visible", timeout=10000)
            await page.wait_for_timeout(1500)
            await page.click("#play-button")
            await page.wait_for_function("window.player && window.player.mesh", timeout=20000)
        except Exception as e:
            print(f"Error starting game: {e}")
            await browser.close()
            return

        print("Game Loaded. Waiting for Idle...")
        await page.wait_for_timeout(2000) # Wait for idle animation to play a bit

        # Screenshot
        screenshot_path = "/app/verification/visual_proof_idle.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
