
import time
from playwright.sync_api import sync_playwright

def verify_cinematic(page):
    print("Loading game...")
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")

    # Click start button
    try:
        page.wait_for_selector("#start-button", state="visible", timeout=5000)
        page.click("#start-button")
    except:
        print("Start button not found or already clicked")

    # Wait for menu and click Play
    try:
        page.wait_for_selector("#play-button", state="visible", timeout=5000)
        time.sleep(1) # Wait for fade in
        page.click("#play-button")
    except:
        print("Play button error")

    # Wait for game to initialize (player exists)
    print("Waiting for game loop...")
    page.wait_for_function("window.player && window.player.mesh")
    time.sleep(2) # Let loading fade out

    # Check if enemy exists
    enemy_count = page.evaluate("window.allEnemiesX1.length")
    print(f"Enemies found: {enemy_count}")

    if enemy_count == 0:
        print("Error: No enemies found in dungeon_1")
        # Snapshot to debug
        page.screenshot(path="verification/debug_no_enemy.png")
        return

    # Trigger Death of Gatekeeper (Index 0 usually, or find by isGatekeeper)
    print("Killing Gatekeeper...")
    page.evaluate("""
        const enemy = window.allEnemiesX1.find(e => e.isGatekeeper);
        if (enemy) {
            // Force kill
            enemy.health = 0;
            enemy.takeHit(); // Trigger logic
        } else {
            console.error("Gatekeeper not found! Check logic.");
        }
    """)

    # Wait for Cinematic to start and reach Hold phase
    # Sequence: 1.5s Pan -> 3s Hold.
    # We want to capture the Hold phase (e.g. at 2.5s after trigger)
    print("Waiting for cinematic hold...")
    time.sleep(3.0)

    # Take Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/cinematic_torch.png")

    # Verify Cinematic Flag
    is_cinematic = page.evaluate("window.isCinematic")
    print(f"Is Cinematic Active: {is_cinematic}")

    # Verify Torch Count
    torch_count = page.evaluate("window.allFlames.length")
    print(f"Active Flames: {torch_count}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_cinematic(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_cinematic.png")
        finally:
            browser.close()
