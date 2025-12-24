
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

        # Mock Authentication to bypass login
        await context.add_init_script("""
            window.LumenfallAuth = {
                onStateChanged: (callback) => {
                    callback({
                        displayName: "Test Pilot",
                        email: "test@lumenfall.com",
                        uid: "TEST_USER_123"
                    }, {});
                },
                currentUser: {
                    displayName: "Test Pilot",
                    email: "test@lumenfall.com",
                    uid: "TEST_USER_123"
                }
            };
        """)

        page = await context.new_page()

        # Load the game using file protocol
        file_path = os.path.abspath("Lumenfall-juego/index.html")
        await page.goto(f"file://{file_path}")

        # Handle Splash Screen and Start Button
        print("Waiting for #start-button...")
        try:
            await page.wait_for_selector("#start-button", state="visible", timeout=5000)
            await page.click("#start-button")
            print("Clicked Splash Screen.")
        except Exception as e:
            print("Start button not found or error:", e)

        # Wait for Main Menu Play Button
        print("Waiting for #play-button...")
        try:
            await page.wait_for_selector("#play-button", state="visible", timeout=5000)
            # Short delay for fade-in
            await page.wait_for_timeout(1500)
            await page.click("#play-button")
            print("Clicked Play Button.")
        except Exception as e:
            print("Play button not found or error:", e)

        # Wait for Game Initialization (player object)
        print("Waiting for player initialization...")
        await page.wait_for_function("() => window.player !== undefined", timeout=10000)

        # Verify Idle Animation Step Logic
        print("Verifying Idle Animation Steps...")

        # Monitor currentFrame over time
        samples = []
        timestamps = []

        # Poll for 2 seconds (approx 20 samples at 100ms interval)
        # Expected behavior: Frame changes every ~125ms (8 FPS).
        # We sample at 50ms to catch the steps.

        for i in range(40): # 2 seconds
            data = await page.evaluate("""() => {
                return {
                    frame: window.player.currentFrame,
                    time: window.player.idleAnimTimer,
                    textureOffsetX: window.player.mesh.material.map ? window.player.mesh.material.map.offset.x : -1
                };
            }""")
            samples.append(data)
            await page.wait_for_timeout(50)

        # Analyze samples
        frames_seen = [s['frame'] for s in samples]
        print(f"Frames observed: {frames_seen}")

        # Verification 1: Are frames Integers? (JS numbers are floats, but logic should keep them integer-like)
        # We check if they increment strictly by 1 (modulo 10)

        valid_transitions = True
        prev_frame = frames_seen[0]
        changes = 0

        for frame in frames_seen[1:]:
            if frame != prev_frame:
                changes += 1
                expected_next = (prev_frame + 1) % 10
                if frame != expected_next:
                    print(f"FAIL: Invalid frame transition from {prev_frame} to {frame}. Expected {expected_next}.")
                    valid_transitions = False
            prev_frame = frame

        if valid_transitions:
            print("PASS: Frame transitions are sequential (step logic works).")
        else:
            print("FAIL: Frame transitions are erratic.")

        if changes > 0:
            print(f"PASS: Animation is playing (observed {changes} changes).")
        else:
            print("FAIL: Animation is stuck.")

        # Verification 2: Check UV Offsets
        # User requirement: offset.x = (col * 0.2) + 0.025
        # We verify one sample
        last_sample = samples[-1]
        frame = last_sample['frame']
        col = frame % 5
        expected_offset = (col * 0.2) + 0.025
        actual_offset = last_sample['textureOffsetX']

        if abs(actual_offset - expected_offset) < 0.0001:
            print(f"PASS: UV Offset for frame {frame} is correct ({actual_offset:.4f}).")
        else:
            print(f"FAIL: UV Offset for frame {frame} is {actual_offset:.4f}, expected {expected_offset:.4f}.")

        # Take screenshot for visual proof
        await page.screenshot(path="verification/idle_jump_fix.png")
        print("Screenshot saved to verification/idle_jump_fix.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
