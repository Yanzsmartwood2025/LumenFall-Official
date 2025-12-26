from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    # Assuming the game runs on localhost via some server, but I need to serve it first.
    # If no server running, I might need to start one.
    # However, for this environment, I can try opening index.html directly if local file access works in headless chrome.
    import os
    cwd = os.getcwd()
    file_url = f"file://{cwd}/Lumenfall-juego/index.html"
    print(f"Navigating to {file_url}")
    page.goto(file_url)

    # Wait for game to load (canvas)
    page.wait_for_selector("#bg-canvas", state="visible")

    # Simulate Start Button Click if present
    if page.is_visible("#start-button"):
        print("Clicking start button...")
        page.click("#start-button")

    # Wait for Play Button if present (menu screen)
    try:
        page.wait_for_selector("#play-button", state="visible", timeout=5000)
        print("Clicking play button...")
        page.click("#play-button")
    except:
        print("Play button not found or not needed")

    # Wait for game to initialize
    page.wait_for_timeout(2000)

    # Simulate Hold Charge Button
    print("Holding charge button...")
    # Trigger keydown or touch event
    # Game uses "attackHeld" logic in update.
    # Mapped to btn-attack or Gamepad.
    # Game also listens to mouse/touch on btn-attack.

    # We can inject JS to simulate controls.attackHeld = true
    page.evaluate("window.player.isAbsorbing = true;")
    # Or better, trigger the event listeners
    # btn-attack mousedown
    if page.is_visible("#btn-attack"):
        page.dispatch_event("#btn-attack", "mousedown")

    # Wait 500ms for animation to reach loop
    page.wait_for_timeout(500)

    # Take Screenshot of loop
    page.screenshot(path="verification/charging_loop.png")
    print("Screenshot loop taken")

    # Release button
    if page.is_visible("#btn-attack"):
        page.dispatch_event("#btn-attack", "mouseup")

    # Wait 100ms for end sequence
    page.wait_for_timeout(100)

    # Take Screenshot of end
    page.screenshot(path="verification/charging_end.png")
    print("Screenshot end taken")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
