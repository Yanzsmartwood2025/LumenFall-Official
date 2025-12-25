import os
from playwright.sync_api import sync_playwright
import time

def run_verification():
    with sync_playwright() as p:
        # Launch with flags for WebGL
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-gl=swiftshader",
                "--enable-unsafe-swiftshader",
                "--enable-webgl",
                "--ignore-gpu-blacklist"
            ]
        )
        page = browser.new_page()

        # 1. Navigate to page
        # Note: We are in /app. Need absolute path or file://
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # 2. Mock Auth
        page.evaluate("""
            window.LumenfallAuth = {
                onStateChanged: (callback) => {
                    // Simulate logged in user
                    callback({ displayName: 'Test Pilot', email: 'test@lumenfall.com' }, {});
                },
                currentUser: { displayName: 'Test Pilot' }
            };
        """)

        # 3. Start Game Sequence
        # Click Start (Intro)
        page.click('#start-button')
        time.sleep(1)

        # Click Play (Menu)
        page.click('#play-button')

        # Wait for Game Load (Canvas visible)
        page.wait_for_selector('#bg-canvas', state='visible')
        time.sleep(2) # Wait for level load

        # 4. Verify Loot Exists
        # Access window.allPowerUps
        loot_count = page.evaluate("window.allPowerUps ? window.allPowerUps.length : 0")
        print(f"Loot Count: {loot_count}")

        # 5. Simulate "Reload/Absorb" Action
        # Mouse down on attack button
        page.dispatch_event('#btn-attack', 'mousedown')

        # 6. Capture Sequence
        # Take screenshots every 100ms to catch the animation
        for i in range(20):
            page.screenshot(path=f"/app/verification/frame_{i}.png")
            time.sleep(0.1)

        page.dispatch_event('#btn-attack', 'mouseup')

        browser.close()

if __name__ == "__main__":
    run_verification()
