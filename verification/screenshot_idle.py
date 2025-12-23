
import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        # Launch browser with specific flags for WebGL/Audio
        browser = await p.chromium.launch(
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
        )
        context = await browser.new_context()
        page = await context.new_page()

        # Load the game using file protocol
        file_path = os.path.abspath("Lumenfall-juego/index.html")
        await page.goto(f"file://{file_path}")

        # Handle Splash Screen and Start Button
        try:
            await page.wait_for_selector("#start-button", state="visible", timeout=5000)
            await page.click("#start-button")
        except:
            pass

        # Wait for Main Menu Play Button
        try:
            await page.wait_for_selector("#play-button", state="visible", timeout=5000)
            await page.wait_for_timeout(1500)
            await page.click("#play-button")
        except:
            pass

        # Wait for game to stabilize in Idle
        await page.wait_for_function("() => window.player !== undefined", timeout=10000)
        await page.wait_for_timeout(2000)

        # Take screenshot
        await page.screenshot(path="verification/idle_check.png")
        print("Screenshot taken.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
