from playwright.sync_api import sync_playwright
import time
import math

def run(playwright):
    browser = playwright.chromium.launch(
        args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]
    )
    context = browser.new_context()
    page = context.new_page()

    # Load the game
    print("Loading game...")
    page.goto("file:///app/Lumenfall-juego/index.html")

    # Bypass authentication
    print("Injecting auth...")
    page.evaluate("""
        window.LumenfallAuth = {
            currentUser: { uid: 'test-user', displayName: 'Test User' },
            onAuthStateChanged: (cb) => cb({ uid: 'test-user', displayName: 'Test User' }),
            getAuth: () => ({})
        };
    """)

    # Start game
    print("Starting game...")
    # Wait for splash screen click listener
    time.sleep(1)
    page.click("#start-button")
    time.sleep(1)

    # Wait for play button
    page.wait_for_selector("#play-button", state="visible")
    page.click("#play-button")

    # Wait for player initialization
    print("Waiting for player...")
    page.wait_for_function("window.player !== undefined")

    # Wait a bit for initialization
    time.sleep(2)

    # Force IDLE state
    print("Forcing IDLE state...")
    page.evaluate("window.player.currentState = 'idle'")
    page.evaluate("window.player.isFacingLeft = false") # Ensure default direction

    # Wait for update loop to process
    time.sleep(0.5)

    # Verify IDLE Texture Repeat
    print("Verifying Texture Repeat...")
    repeat_x = page.evaluate("window.player.idleTexture.repeat.x")
    repeat_y = page.evaluate("window.player.idleTexture.repeat.y")

    print(f"Repeat X: {repeat_x} (Expected: 0.2)")
    print(f"Repeat Y: {repeat_y} (Expected: 0.5)")

    if abs(repeat_x - 0.2) > 0.001:
        raise Exception(f"Repeat X mismatch! Got {repeat_x}")
    if abs(repeat_y - 0.5) > 0.001:
        raise Exception(f"Repeat Y mismatch! Got {repeat_y}")

    # Verify IDLE Scale
    print("Verifying Scale...")
    scale_x = page.evaluate("window.player.mesh.scale.x")
    player_scale = 1.35
    target_scale_x = player_scale * 0.85 # 1.1475

    print(f"Scale X: {scale_x} (Expected: {target_scale_x})")

    if abs(scale_x - target_scale_x) > 0.001:
        raise Exception(f"Scale X mismatch! Got {scale_x}, Expected {target_scale_x}")

    print("SUCCESS: IDLE state verification passed!")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
