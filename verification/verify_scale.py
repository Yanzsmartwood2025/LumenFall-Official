
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_player_scale():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Using default context
        context = await browser.new_context()
        page = await context.new_page()

        try:
            # Navigate to the game
            await page.goto("http://localhost:8000/Lumenfall-juego/")

            # Wait for Start button and click it
            print("Waiting for Start button...")
            start_btn = page.locator('#start-button')
            await expect(start_btn).to_be_visible()
            await start_btn.click()

            # Wait for Play button and click it
            print("Waiting for Play button...")
            play_btn = page.locator('#play-button')
            await expect(play_btn).to_be_visible(timeout=10000)
            await play_btn.click()

            # Wait for game to initialize
            print("Waiting for game to load...")
            await page.wait_for_function("window.player && window.player.mesh")
            await page.wait_for_timeout(2000)

            # Get Joystick Element
            joystick = page.locator('#joystick-container')
            await expect(joystick).to_be_visible()
            box = await joystick.bounding_box()
            if not box:
                print("Error: Joystick not found")
                return

            center_x = box['x'] + box['width'] / 2
            center_y = box['y'] + box['height'] / 2

            print(f"Joystick Center: {center_x}, {center_y}")

            # --- TEST CASE 1: MOVE/JUMP RIGHT ---
            print("\n--- Testing Jump Right ---")

            # Move mouse to center, click and drag Right and Up (for Jump)
            await page.mouse.move(center_x, center_y)
            await page.mouse.down()
            # Drag to Right-Up (Diagonal) to trigger X movement and Y jump
            await page.mouse.move(center_x + 50, center_y - 50, steps=5)

            # Wait for jump to initiate
            await page.wait_for_timeout(500)

            # Capture state
            jump_scale_right = await page.evaluate("window.player.mesh.scale.x")
            state_right = await page.evaluate("window.player.currentState")
            facing_left_right = await page.evaluate("window.player.isFacingLeft")

            print(f"State: {state_right}")
            print(f"Facing Left: {facing_left_right}")
            print(f"Scale X: {jump_scale_right}")

            if abs(jump_scale_right - 1.15) < 0.01:
                print("PASS: Jump Right Scale is 1.15")
            else:
                print(f"FAIL: Jump Right Scale is {jump_scale_right} (Expected 1.15)")

            await page.screenshot(path="verification/jump_right.png")

            # Release
            await page.mouse.up()
            await page.wait_for_timeout(1000)

            # --- TEST CASE 2: MOVE/JUMP LEFT ---
            print("\n--- Testing Jump Left ---")

            await page.mouse.move(center_x, center_y)
            await page.mouse.down()
            # Drag to Left-Up
            await page.mouse.move(center_x - 50, center_y - 50, steps=5)

            await page.wait_for_timeout(500)

            jump_scale_left = await page.evaluate("window.player.mesh.scale.x")
            state_left = await page.evaluate("window.player.currentState")
            facing_left_left = await page.evaluate("window.player.isFacingLeft")

            print(f"State: {state_left}")
            print(f"Facing Left: {facing_left_left}")
            print(f"Scale X: {jump_scale_left}")

            if abs(jump_scale_left - 1.15) < 0.01:
                print("PASS: Jump Left Scale is 1.15")
            else:
                print(f"FAIL: Jump Left Scale is {jump_scale_left} (Expected 1.15)")

            await page.screenshot(path="verification/jump_left.png")

            await page.mouse.up()
            await page.wait_for_timeout(1000)

            # --- TEST CASE 3: IDLE RIGHT ---
            print("\n--- Testing Idle Right ---")
            # Ensure facing right (tap right)
            await page.mouse.move(center_x, center_y)
            await page.mouse.down()
            await page.mouse.move(center_x + 50, center_y, steps=2)
            await page.mouse.up()
            await page.wait_for_timeout(500) # Wait for idle

            idle_scale_right = await page.evaluate("window.player.mesh.scale.x")
            state_right_idle = await page.evaluate("window.player.currentState")
            print(f"Idle Right Scale: {idle_scale_right}, State: {state_right_idle}")

            if abs(idle_scale_right - 1.65) < 0.01:
                print("PASS: Idle Right Scale is 1.65")
            else:
                print(f"FAIL: Idle Right Scale is {idle_scale_right} (Expected 1.65)")

            # --- TEST CASE 4: IDLE LEFT ---
            print("\n--- Testing Idle Left ---")
            # Tap left
            await page.mouse.move(center_x, center_y)
            await page.mouse.down()
            await page.mouse.move(center_x - 50, center_y, steps=2)
            await page.mouse.up()
            await page.wait_for_timeout(500)

            idle_scale_left = await page.evaluate("window.player.mesh.scale.x")
            print(f"Idle Left Scale: {idle_scale_left}")

            if abs(idle_scale_left - 1.32) < 0.01:
                print("PASS: Idle Left Scale is 1.32")
            else:
                print(f"FAIL: Idle Left Scale is {idle_scale_left} (Expected 1.32)")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            await page.screenshot(path="verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_player_scale())
