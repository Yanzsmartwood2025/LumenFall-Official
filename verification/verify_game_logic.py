
from playwright.sync_api import sync_playwright
import os

def check_game_loading():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # We need to simulate a context where audio can run if possible, but headless often blocks it.
        # However, we primarily want to verify the game loads without error after refactoring.
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Load the local index.html. Assuming 'Lumenfall-juego/index.html' exists.
        # We need the absolute path.
        cwd = os.getcwd()
        file_url = f'file://{cwd}/Lumenfall-juego/index.html'

        print(f'Navigating to {file_url}')
        page.goto(file_url)

        # Wait for start button
        try:
            page.wait_for_selector('#start-button', state='visible', timeout=5000)
            print('Start button visible.')
            page.click('#start-button')
            print('Clicked start button.')

            # Wait for play button (menu)
            page.wait_for_selector('#play-button', state='visible', timeout=5000)
            print('Play button visible.')

            # Click play to start game loop
            page.click('#play-button')
            print('Clicked play button.')

            # Wait a bit for game to initialize
            page.wait_for_timeout(2000)

            # Inspect Global Variables to verify our changes
            # 1. Check logic: allWalkingMonsters should be undefined or not present/empty if we removed it properly.
            # actually we removed the variable declaration, so accessing it might throw ReferenceError or return undefined if on window.

            # We defined variables with 'const' or 'let' in the top scope of game.js.
            # In browser JS modules or script tags, top-level vars might not be on window if it's a module,
            # but here it seems to be a standard script.
            # Let's check if 'EnemyX1' class exists and 'WalkingMonster' does NOT.

            checks = page.evaluate('''() => {
                const results = {};
                try { results.hasEnemyX1 = (typeof EnemyX1 !== 'undefined'); } catch(e) { results.hasEnemyX1 = false; }
                try { results.hasWalkingMonster = (typeof WalkingMonster !== 'undefined'); } catch(e) { results.hasWalkingMonster = false; }
                try { results.hasSpecter = (typeof Specter !== 'undefined'); } catch(e) { results.hasSpecter = false; }
                try { results.hasDecorGhost = (typeof DecorGhost !== 'undefined'); } catch(e) { results.hasDecorGhost = false; }

                // Check MAPS
                if (typeof MAPS !== 'undefined' && MAPS.dungeon_1) {
                    results.spectersEmpty = (MAPS.dungeon_1.specters.length === 0);
                } else {
                    results.spectersEmpty = 'MAPS_UNDEFINED';
                }

                // Check if enemies spawned
                if (typeof allEnemiesX1 !== 'undefined') {
                    results.enemyCount = allEnemiesX1.length;
                    if (results.enemyCount > 0 && allEnemiesX1[0].mesh) {
                         results.enemyTextureFilter = allEnemiesX1[0].mesh.material.map.magFilter;
                    }
                }

                return results;
            }''')

            print('Verification Results:', checks)

            # Expect:
            # hasEnemyX1: True
            # hasWalkingMonster: False
            # hasSpecter: False
            # hasDecorGhost: True
            # spectersEmpty: True
            # enemyTextureFilter: 1003 (NearestFilter) -> Three.js constant. Linear is 1006.

            page.screenshot(path='verification/game_check.png')

        except Exception as e:
            print(f'Error during verification: {e}')
            page.screenshot(path='verification/error.png')

        browser.close()

if __name__ == '__main__':
    check_game_loading()
