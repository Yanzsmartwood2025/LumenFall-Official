
from playwright.sync_api import sync_playwright
import os

def check_game_fix():
    file_path = os.path.abspath('Lumenfall-juego/index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
        )
        page = browser.new_page()
        page.goto(url)

        # Wait a bit for scripts to load
        page.wait_for_timeout(2000)

        # Check definitions one by one to avoid syntax complexity in one block
        spawn_loot = page.evaluate('typeof window.spawnLoot === function')
        hud_proj = page.evaluate('typeof window.HUDProjectile === function')
        power_up = page.evaluate('window.PowerUp === window.LootItem')

        print(f'spawnLoot defined: {spawn_loot}')
        print(f'HUDProjectile defined: {hud_proj}')
        print(f'PowerUp aliased: {power_up}')

        if not spawn_loot or not hud_proj or not power_up:
            print('FAILURE: Missing definitions')
        else:
            print('SUCCESS: All definitions present')

        page.screenshot(path='verification/game_fix_verification.png')
        browser.close()

if __name__ == '__main__':
    check_game_fix()
