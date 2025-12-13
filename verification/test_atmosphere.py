import asyncio
from playwright.async_api import async_playwright
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        # Navigate to the game
        await page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for game to load
        await page.wait_for_selector("#start-button", state="visible")

        # Click start
        await page.click("#start-button")

        # Wait for intro to finish and menu to appear
        # The game has an intro image transition
        await page.wait_for_timeout(2000)
        await page.wait_for_selector("#play-button", state="visible")

        # Click Play
        await page.click("#play-button")

        # Wait for game to start (canvas visible)
        await page.wait_for_selector("#bg-canvas", state="visible")
        await page.wait_for_timeout(2000) # Wait for level load

        # Inject code to trigger lightning immediately for verification
        print("Triggering lightning...")
        await page.evaluate("""
            if (window.lightningLight) {
                triggerLightning();
            } else {
                console.error("lightningLight not found");
            }
        """)

        # Wait a brief moment to catch the flash in a screenshot
        await page.wait_for_timeout(50)
        await page.screenshot(path="verification/atmosphere_check.png")
        print("Screenshot taken: verification/atmosphere_check.png")

        # Check if dust particles are present
        dust_count = await page.evaluate("""
            (function() {
                // Access the scene through global variables exposed for debug, or traverse
                // We exposed `window.scene` in previous turns or the code I just read?
                // `window.scene` was exposed in the code I read.
                if (window.scene) {
                    // Find dust points
                    let dust = window.scene.children.find(c => c.type === 'Points' && c.material.size === 0.8);
                    return dust ? dust.geometry.attributes.position.count : 0;
                }
                return -1;
            })()
        """)

        print(f"Dust particles count: {dust_count}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
