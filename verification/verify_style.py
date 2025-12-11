from playwright.sync_api import sync_playwright

def verify_game_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context that does NOT grant autoplay permissions, as per memory
        context = browser.new_context()
        page = context.new_page()

        # Go to the local server
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for the Start button and click it to enter menu
        page.wait_for_selector("#start-button")
        page.click("#start-button")

        # Wait for transition to menu
        page.wait_for_selector("#play-button")

        # Click Play to enter game
        page.click("#play-button")

        # Wait for game canvas and UI
        page.wait_for_selector("#ui-container")

        # Locate the Reload/Attack button
        btn_attack = page.locator("#btn-attack")

        # Wait a bit for the game to initialize and render
        page.wait_for_timeout(2000)

        # Screenshot the Attack button (Reload) to verify flame rotation
        btn_attack.screenshot(path="verification/btn_attack_initial.png")

        # Simulate pressing the button to trigger the active aura
        # We use mouse events to trigger :active state and JS listeners
        box = btn_attack.bounding_box()
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        page.mouse.down()

        # Wait a moment for the aura to appear/pulse
        page.wait_for_timeout(200)

        # Screenshot the button while pressed to verify the blue aura color
        # We capture a slightly larger area to see the glow
        page.screenshot(path="verification/btn_attack_pressed.png", clip={
            "x": box["x"] - 20,
            "y": box["y"] - 20,
            "width": box["width"] + 40,
            "height": box["height"] + 40
        })

        page.mouse.up()
        browser.close()

if __name__ == "__main__":
    verify_game_ui()
