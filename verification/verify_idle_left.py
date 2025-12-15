from playwright.sync_api import sync_playwright, expect
import time

def verify_idle_left():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Removed autoplay permission as it caused an error
        context = browser.new_context()
        page = context.new_page()

        # 1. Load the game
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # 2. Start Game (Click Splash Screen, then Play Button)
        print("Waiting for start button...")
        page.wait_for_selector('#start-button', state='visible')
        page.click('#start-button')

        print("Waiting for play button...")
        page.wait_for_selector('#play-button', state='visible', timeout=10000)
        time.sleep(1) # Ensure opacity transition
        page.click('#play-button')

        print("Waiting for player initialization...")
        page.wait_for_function("() => window.player && window.player.mesh")

        # 3. Simulate Move Left
        print("Simulating Move Left...")

        # Get joystick location
        joystick = page.locator('#joystick-container')
        box = joystick.bounding_box()
        center_x = box['x'] + box['width'] / 2
        center_y = box['y'] + box['height'] / 2

        # Drag from center to Left
        page.mouse.move(center_x, center_y)
        page.mouse.down()
        page.mouse.move(center_x - 50, center_y) # Move Left

        print("Holding Left...")
        time.sleep(0.5)

        # Verify we are running left
        state = page.evaluate("window.player.currentState")
        facing = page.evaluate("window.player.isFacingLeft")
        print(f"State during move: {state}, Facing Left: {facing}")

        if state != 'running' or not facing:
            print("Failed to move left.")

        # 4. Release to enter Idle
        print("Releasing Joystick (Idle)...")
        page.mouse.up()

        time.sleep(1.0) # Wait for state to settle to idle

        # 5. Verify State
        print("Verifying Idle Left State...")
        player_state = page.evaluate("""() => {
            const p = window.player;
            return {
                currentState: p.currentState,
                isFacingLeft: p.isFacingLeft,
                rotationY: p.mesh.rotation.y,
                glowMeshScaleX: p.glowMesh.scale.x,
                textureSrc: p.mesh.material.map.image ? p.mesh.material.map.image.src : 'no-image'
            }
        }""")

        print("Player State:", player_state)

        # Assertions
        if player_state['currentState'] != 'idle':
            print("Error: Player is not idle.")

        if not player_state['isFacingLeft']:
            print("Error: Player is not facing left.")

        if abs(player_state['rotationY']) > 0.01:
            print(f"Error: Rotation Y should be 0, got {player_state['rotationY']}")
        else:
            print("Success: Rotation Y is 0.")

        if player_state['glowMeshScaleX'] != -1:
            print(f"Error: GlowMesh Scale X should be -1, got {player_state['glowMeshScaleX']}")
        else:
            print("Success: GlowMesh Scale X is -1.")

        if 'idle-B.png' in player_state['textureSrc']:
            print("Success: Texture is idle-B.png")
        else:
            print(f"Error: Texture is {player_state['textureSrc']}")

        page.screenshot(path="verification/verification.png")
        print("Screenshot saved.")
        browser.close()

if __name__ == "__main__":
    verify_idle_left()
