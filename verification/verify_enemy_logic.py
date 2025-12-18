from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Important: Do not grant 'autoplay' per memory guidelines to avoid failure
    context = browser.new_context()
    page = context.new_page()

    # Load the game
    page.goto("http://localhost:8080/Lumenfall-juego/index.html")

    # Wait for game to be ready (start button visible)
    page.wait_for_selector("#start-button", state="visible")

    # Click start button to initialize audio context and game
    page.click("#start-button")

    # Wait for Play button in menu
    page.wait_for_selector("#play-button", state="visible")

    # Instantiate EnemyX1 manually in the console to verify logic
    # We check if the constructor runs without error and properties are set
    # Note: 'scene' and 'EnemyX1' must be accessible. 'scene' is exposed in game.js window.scene
    # 'EnemyX1' class is global in game.js scope

    result = page.evaluate("""
        () => {
            try {
                // Ensure EnemyX1 class exists
                if (typeof EnemyX1 === 'undefined') return { success: false, error: 'EnemyX1 class not defined' };

                // Try to create an instance
                const testEnemy = new EnemyX1(window.scene, 0);

                return {
                    success: true,
                    maxHealth: testEnemy.maxHealth,
                    state: testEnemy.state,
                    attackCooldown: testEnemy.attackCooldown,
                    hasRunTexture: !!testEnemy.runTexture,
                    hasAttackTexture: !!testEnemy.attackTexture,
                    hasDeathTexture: !!testEnemy.deathTexture
                };
            } catch (e) {
                return { success: false, error: e.toString() };
            }
        }
    """)

    print(f"Instantiation Result: {result}")

    if not result['success']:
        print(f"Verification Failed: {result.get('error')}")
        browser.close()
        exit(1)

    # Verify specific properties based on our changes
    assert result['maxHealth'] == 8
    assert result['state'] == 'PATROL'
    assert result['hasRunTexture'] == True
    assert result['hasAttackTexture'] == True
    assert result['hasDeathTexture'] == True

    print("EnemyX1 Logic Verified Successfully.")

    # Take a screenshot just in case (though mostly logic verification)
    page.screenshot(path="verification/enemy_x1_logic_check.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
