from playwright.sync_api import sync_playwright, expect
import time

def verify_enemy_x1(page):
    # 1. Load the game
    page.goto("file:///app/Lumenfall-juego/index.html")

    # 2. Start Game Flow
    # Click Start Splash
    page.click("#start-button")

    # Wait for Menu to fade in and Play button to be visible
    # The splash screen transition takes some time
    time.sleep(1)
    page.wait_for_selector("#play-button", state="visible")

    # Click Play
    page.click("#play-button")

    # Wait for game to initialize (intro fade out)
    time.sleep(2)

    # 3. Verify Enemy Existence and Logic via Console/Evaluate
    # Check if allEnemiesX1 is populated
    enemy_count = page.evaluate("window.allEnemiesX1.length")
    print(f"Enemy Count: {enemy_count}")
    assert enemy_count > 0, "No EnemyX1 instances found!"

    # 4. Teleport Player to see Enemy (Enemy at -40)
    # Teleport to -35 to face it
    page.evaluate("window.player.mesh.position.x = -35")
    time.sleep(0.5) # Allow frame update

    # 5. Check Enemy State
    enemy_info = page.evaluate("""
        () => {
            const enemy = window.allEnemiesX1[0];
            return {
                x: enemy.mesh.position.x,
                state: enemy.state,
                health: enemy.health,
                textureSrc: enemy.mesh.material.map.image.src,
                framesRun: 10, // constant in code
                framesDeath: 9 // constant in code
            };
        }
    """)
    print(f"Enemy Info: {enemy_info}")

    # Verify Texture path contains 'Ataques-enemigo1' (implies V11)
    # Note: image.src might be full path file://...
    assert "Ataques-enemigo1" in enemy_info['textureSrc'], f"Incorrect texture source: {enemy_info['textureSrc']}"

    # 6. Take Screenshot
    page.screenshot(path="/app/verification/enemy_x1_verification.png")
    print("Screenshot saved to verification/enemy_x1_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-web-security'])
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_enemy_x1(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/app/verification/error_state.png")
        finally:
            browser.close()
