from playwright.sync_api import sync_playwright

def verify_enemy_audio():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Removed explicit permissions as autoplay might cause issues or is not needed
        context = browser.new_context()
        page = context.new_page()

        # 1. Load the game
        page.goto('http://localhost:8000/Lumenfall-juego/index.html')

        # 2. Start the game (Click Splash Screen, then Play)
        page.locator('#start-button').click()
        page.locator('#play-button').wait_for(state='visible')
        page.locator('#play-button').click()

        # Wait for game to load
        page.wait_for_timeout(2000)

        # 3. Inject a SimpleEnemy and inspect its properties
        # We also need to check if the audio nodes have the correct gain values.
        # Since we can't easily read AudioParam values directly in a snapshot, we will check the logic variables.

        result = page.evaluate("""() => {
            // Instantiate an enemy if none exists (dungeon_1 is empty usually)
            if (allSimpleEnemies.length === 0) {
                allSimpleEnemies.push(new SimpleEnemy(scene, 0));
            }
            const enemy = allSimpleEnemies[0];

            // Move player to 0
            player.mesh.position.set(0, player.mesh.geometry.parameters.height/2, 0);

            // Check Step Timer Reset Value
            // Force stepTimer to -0.1 and call update with small delta
            enemy.stepTimer = -0.1;
            enemy.update(0.016);

            const stepTimerAfter = enemy.stepTimer;

            // Check Growl Audio logic
            const distance = 0; // Player at 0, Enemy at 0

            // We can check if growl source exists

            return {
                stepTimerReset: stepTimerAfter, // Should be close to 1.2
                hasGrowlSource: !!enemy.growlSource,
                hasGrowlGain: !!enemy.growlGain,
                growlLoop: enemy.growlSource ? enemy.growlSource.loop : false
            };
        }""")

        print(f"Verification Result: {result}")

        # Take a screenshot just to show the game runs
        page.screenshot(path='verification/audio_check.png')

        browser.close()

if __name__ == "__main__":
    verify_enemy_audio()
