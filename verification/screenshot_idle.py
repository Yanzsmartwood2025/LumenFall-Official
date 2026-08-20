import asyncio
from playwright.async_api import async_playwright
import time

async def capture_frame_screenshot():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security",
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
            body="window.LumenfallAuth = { currentUser: { uid: 'test-user', displayName: 'TEST' }, onAuthStateChanged: (cb) => cb({ uid: 'test-user' }) };"
        ))

        # Navigate
        print("Navigating...")
        await page.goto("file:///app/Lumenfall-juego/index.html")

        # Click Start
        try:
            await page.wait_for_selector("#start-button", timeout=5000)
            await page.click("#start-button")
        except:
            print("Start button skipped or missing")

        # Click Play
        try:
            await page.wait_for_selector("#play-button", state="visible", timeout=5000)
            await page.wait_for_function("document.getElementById('play-button').textContent.includes('JUGAR') || document.getElementById('play-button').textContent.includes('PLAY')", timeout=10000)
            await page.click("#play-button")
        except Exception as e:
            print(f"Play button error: {e}")

        # Wait for Player
        print("Waiting for player...")
        await page.wait_for_function("window.player && window.player.mesh", timeout=10000)

        # Wait a bit for idle to start
        await asyncio.sleep(1)

        # Capture a screenshot of the player area
        print("Taking screenshot...")
        # We can try to clip to the player
        # Player is centered at 0, 0.8, 0 usually. In screen space, that's center.

        await page.screenshot(path="verification/frame_check.png")
        print("Screenshot saved to verification/frame_check.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture_frame_screenshot())
