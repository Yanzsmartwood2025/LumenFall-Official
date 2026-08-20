import os
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--use-gl=swiftshader",  # Essential for WebGL in headless
            "--autoplay-policy=no-user-gesture-required", # Allow audio
            "--mute-audio"
        ]
    )
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        device_scale_factor=1,
    )
    page = context.new_page()

    # Mock Auth Core to bypass redirect
    page.route("**/auth-core.js", lambda route: route.fulfill(
        status=200,
        content_type="application/javascript",
        body="""
            window.LumenfallAuth = {
                onStateChanged: (callback) => {
                    // Simulate logged in user
                    callback({
                        displayName: "Test User",
                        email: "test@example.com",
                        photoURL: "assets/ui/hud/UI_HUD_Portrait_Player_Circle.png" // Use new asset to simulate correct state
                    }, {});
                },
                currentUser: { displayName: "Test User" }
            };
            console.log("Mock Auth Core Loaded");
        """
    ))

    # Mock AudioContext to prevent blocking
    page.add_init_script("""
        window.AudioContext = window.webkitAudioContext = class {
            createGain() { return { gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, setTargetAtTime: () => {}, cancelScheduledValues: () => {} }, connect: () => ({ connect: () => {} }) }; }
            createBufferSource() { return { buffer: null, loop: false, playbackRate: { value: 1 }, connect: () => ({ connect: () => {} }), start: () => {}, stop: () => {} }; }
            decodeAudioData(buffer) { return Promise.resolve({}); }
            resume() { return Promise.resolve(); }
            get state() { return 'running'; }
            get destination() { return {}; }
            get currentTime() { return 0; }
        };
    """)

    # Navigate to the game page
    cwd = os.getcwd()
    file_url = f"file://{cwd}/Lumenfall-juego/index.html"
    print(f"Navigating to {file_url}")
    page.goto(file_url)

    # Wait for the start button and click it to initialize the game
    print("Waiting for start button...")
    page.wait_for_selector("#start-button", state="visible", timeout=10000)
    page.click("#start-button")

    # Wait for the menu to appear (Play button)
    print("Waiting for play button...")
    page.wait_for_selector("#play-button", state="visible", timeout=10000)
    page.click("#play-button")

    # Wait for UI container to be visible
    print("Waiting for UI container...")
    page.wait_for_selector("#ui-container", state="visible", timeout=20000)

    # Allow some time for the game loop to start and UI to settle
    page.wait_for_timeout(2000)

    # Ensure the profile container is visible
    page.wait_for_selector("#player-profile-container", state="visible")

    # Take a screenshot of the top UI
    screenshot_path = os.path.join(cwd, "verification/hud_verification.png")

    # We can screenshot specifically the profile container
    element = page.locator("#ui-top")
    element.screenshot(path=screenshot_path)

    print(f"Screenshot saved to {screenshot_path}")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
