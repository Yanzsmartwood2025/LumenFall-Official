from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Start Game
        print("Clicking Start...")
        page.click("#start-button")

        print("Waiting for Play Button...")
        try:
            # Wait for play button
            page.wait_for_selector("#play-button", state="visible", timeout=10000)
            page.click("#play-button")
            print("Clicked Play.")
        except Exception as e:
            print(f"Error clicking play: {e}")
            # Try continuing anyway

        # Wait for player initialization
        print("Waiting for player initialization...")
        # Increase timeout just in case
        try:
            page.wait_for_function("typeof window.player !== 'undefined'", timeout=15000)
            time.sleep(2) # Extra buffer
        except Exception as e:
            print(f"Timeout waiting for player: {e}")
            return # Cannot proceed

        # Trigger Death
        print("Triggering Death Sequence...")
        page.evaluate("window.player.takeDamage(1000, {mesh: {position: {distanceTo: () => 0}}})")

        # Verify Phase 1: Agony (Flicker)
        print("Verifying Agony Phase...")
        time.sleep(0.5)
        # We expect it to be visible (display block)
        overlay_display = page.evaluate("document.getElementById('agony-overlay').style.display")
        print(f"Agony Overlay Display: {overlay_display}")
        page.screenshot(path="verification/1_agony_phase.png")

        # Wait for Video Phase (2s + buffer)
        print("Waiting for Video Phase...")
        time.sleep(2.5)

        video_display = page.evaluate("document.getElementById('death-video-container').style.display")
        print(f"Video Container Display: {video_display}")
        page.screenshot(path="verification/2_video_phase.png")

        # Simulate Video End
        print("Simulating Video End...")
        page.evaluate("""
            const video = document.getElementById('death-video-element');
            if(video) {
                video.dispatchEvent(new Event('ended'));
            } else {
                console.error("Video element not found!");
            }
        """)

        # Verify Phase 3: Game Over
        print("Verifying Game Over Screen...")
        time.sleep(1)
        game_over_display = page.evaluate("document.getElementById('game-over-screen').style.display")
        print(f"Game Over Display: {game_over_display}")

        # Check Styles
        # Note: Computed style might return quotes or not depending on browser
        font_family = page.evaluate("window.getComputedStyle(document.querySelector('#game-over-screen h1')).fontFamily")
        color = page.evaluate("window.getComputedStyle(document.querySelector('#game-over-screen h1')).color")

        print(f"Game Over Font: {font_family}")
        print(f"Game Over Color: {color}")

        page.screenshot(path="verification/3_game_over.png")

        browser.close()

if __name__ == "__main__":
    run()
