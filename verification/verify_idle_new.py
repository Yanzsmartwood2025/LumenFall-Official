
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

        # Verify Initial Idle State
        print("Verifying Initial Idle State...")

        # Check Scale and Rotation
        player_info = await page.evaluate("""() => {
            return {
                scaleX: window.player.mesh.scale.x,
                rotationY: window.player.mesh.rotation.y,
                state: window.player.currentState
            };
        }""")

        print(f"Initial State: {player_info}")
        if player_info['state'] != 'idle':
            print("ERROR: Player is not in idle state.")
        else:
            print("Player is in idle state.")

        if abs(player_info['scaleX'] - 4.0) < 0.01:
            print("PASS: Scale is 4.0")
        else:
            print(f"FAIL: Scale is {player_info['scaleX']}, expected 4.0")

        if player_info['rotationY'] == 0:
            print("PASS: Rotation Y is 0")
        else:
            print(f"FAIL: Rotation Y is {player_info['rotationY']}, expected 0")

        # Monitor Animation Loop
        print("Monitoring Animation Loop (Breathing Phase)...")
        frames_seen = set()
        for _ in range(20): # Monitor for ~2 seconds
            frame = await page.evaluate("window.player.currentFrame")
            frames_seen.add(frame)
            await page.wait_for_timeout(100)

        print(f"Frames seen in first 2 seconds: {frames_seen}")
        if frames_seen.issubset({0, 1, 2}):
            print("PASS: Breathing phase constrained to frames 0-2.")
        else:
            print(f"FAIL: Breathing phase showed frames {frames_seen}")

        # Wait for Special Animation Trigger (> 3.0s)
        print("Waiting for Special Animation Trigger...")
        # We need to wait enough time for idleTimer to cross 3.0.
        # It's been running for ~2s. Wait another 1.5s.
        await page.wait_for_timeout(2000)

        # Monitor Special Phase
        print("Monitoring Special Phase...")
        special_frames_seen = set()
        special_triggered = False

        # Poll rapidly to catch the transition
        for _ in range(40): # 4 seconds monitoring
            data = await page.evaluate("""() => {
                return {
                    frame: window.player.currentFrame,
                    timer: window.player.idleTimer,
                    isSpecial: window.player.isPlayingSpecialIdle
                }
            }""")
            special_frames_seen.add(data['frame'])
            if data['isSpecial']:
                special_triggered = True
            await page.wait_for_timeout(100)

        print(f"Frames seen during potential special phase: {special_frames_seen}")

        if special_triggered:
            print("PASS: Special Idle flag was triggered.")
        else:
            print("FAIL: Special Idle flag was NOT triggered.")

        # Check if high frames were seen
        high_frames = {f for f in special_frames_seen if f > 2}
        if high_frames:
             print(f"PASS: High frames observed: {high_frames}")
        else:
             print("FAIL: No high frames (3-10) observed.")

        # Verify Return to Breathing
        print("Verifying Return to Breathing...")
        # Wait for animation to likely finish (it takes 8 frames * 150ms = 1.2s, wait 2s to be safe)
        await page.wait_for_timeout(2000)

        final_frames = set()
        for _ in range(10):
            frame = await page.evaluate("window.player.currentFrame")
            final_frames.add(frame)
            await page.wait_for_timeout(100)

        print(f"Frames seen after special sequence: {final_frames}")
        if final_frames.issubset({0, 1, 2}):
            print("PASS: Returned to breathing phase.")
        else:
            print("FAIL: Did not return to breathing phase cleanly.")

        # Verify No Rotation on Left Face
        print("Verifying No Rotation when facing Left...")
        await page.evaluate("""() => {
            window.player.isFacingLeft = true;
            // Force update logic to run once
            window.player.update(0.016, {joyVector:{x:0, y:0}, attackHeld:false});
        }""")

        rot_y = await page.evaluate("window.player.mesh.rotation.y")
        if rot_y == 0:
            print("PASS: Rotation Y is still 0 after facing left.")
        else:
             print(f"FAIL: Rotation Y changed to {rot_y} when facing left.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
