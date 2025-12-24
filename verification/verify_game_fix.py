
from playwright.sync_api import sync_playwright
import os

def check_game_fix():
    # Construct the absolute path to the local file
    file_path = os.path.abspath('Lumenfall-juego/index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        # Launch browser with arguments needed for WebGL/Audio in this env
        browser = p.chromium.launch(
            headless=True,
            args=['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
        )
        context = browser.new_context()
        page = context.new_page()

        print(f'Navigating to {url}')
        page.goto(url)

        # 1. Verify CSS Fix for #spectral-bar
        print('Verifying CSS...')
        spectral_bar = page.locator('#spectral-bar')
        # Wait for it to be attached
        spectral_bar.wait_for(state='attached')

        # Evaluate CSS properties
        box = spectral_bar.evaluate('el => { const s = window.getComputedStyle(el); return { position: s.position, top: s.top, right: s.right, width: s.width, height: s.height }; }')

        print(f'Spectral Bar CSS: {box}')

        if box['position'] != 'fixed':
            print('FAIL: position is not fixed')
        if box['top'] != '20px':
            print('FAIL: top is not 20px')
        if box['width'] != '64px':
            print('FAIL: width is not 64px')

        # 2. Verify JS Fixes (Global Definitions)
        print('Verifying Global Definitions...')
        # We need to wait for game.js to load. checking window properties.
        # Since it's a module/script, we might need a small delay or wait for a specific element
        page.wait_for_timeout(1000)

        js_check = page.evaluate('''() => {
            return {
                spawnLootDefined: typeof window.spawnLoot === function,
                HUDProjectileDefined: typeof window.HUDProjectile === function,
                LootItemDefined: typeof window.LootItem === function,
                PowerUpAliased: window.PowerUp === window.LootItem
            }
        }''')

        print(f'JS Definitions: {js_check}')

        if not js_check['spawnLootDefined']:
            print('FAIL: spawnLoot is not defined')
        if not js_check['HUDProjectileDefined']:
            print('FAIL: HUDProjectile is not defined')
        if not js_check['PowerUpAliased']:
            print('FAIL: PowerUp is not aliased to LootItem')

        # Screenshot for visual proof
        page.screenshot(path='verification/game_fix_verification.png')
        print('Screenshot saved to verification/game_fix_verification.png')

        browser.close()

if __name__ == '__main__':
    check_game_fix()
