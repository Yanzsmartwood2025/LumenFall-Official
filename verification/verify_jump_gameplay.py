
from playwright.sync_api import sync_playwright, expect
import time

def verify_game_jump(page):
    # Enable console logging
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))

    # Navigate to game
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")

    # Click start button to enter menu
    start_btn = page.locator("#start-button")
    expect(start_btn).to_be_visible()
    start_btn.click()

    # Wait for menu transition and click Play
    play_btn = page.locator("#play-button")
    expect(play_btn).to_be_visible()
    # Wait a bit for transition to finish completely
    page.wait_for_timeout(1000)
    play_btn.click()

    # Wait for game to load (player object to exist)
    page.wait_for_function("() => window.player && window.player.mesh")

    # Inject a script to monitor frame changes and force a jump
    page.evaluate("""
        window.frameLog = [];
        window.monitorFrames = true;

        // Hook into the update loop via a proxy or just polling?
        // Easier to just modify the Player.update method wrapper or poll

        // Let's poll since we can't easily wrap the method at runtime without reloading
        setInterval(() => {
            if (window.player && window.monitorFrames) {
                const p = window.player;
                // Only log if state is jumping or landing
                if (p.currentState === 'jumping' || p.currentState === 'landing') {
                    const entry = `${p.currentState}:${p.currentFrame}:${p.velocity.y.toFixed(2)}`;
                    if (window.frameLog[window.frameLog.length-1] !== entry) {
                        window.frameLog.push(entry);
                    }
                }
            }
        }, 16); // ~60fps poll

        // Force jump
        setTimeout(() => {
            console.log("Forcing Jump...");
            window.player.jumpInputReceived = true;
            window.player.isJumping = true;
            window.player.isGrounded = false;
            window.player.velocity.y = window.player.jumpPower;
            window.player.currentState = 'jumping';
            window.player.currentFrame = -1;
        }, 1000);
    """)

    # Wait for jump to complete (approx 1-2 seconds)
    page.wait_for_timeout(2500)

    # Retrieve logs
    logs = page.evaluate("window.frameLog")
    print("\nRecorded Frames (State:Frame:Vy):")
    for log in logs:
        print(log)

    # Take screenshot for visual confirmation (though animation is hard to capture in one frame)
    page.screenshot(path="/app/verification/jump_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_game_jump(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
