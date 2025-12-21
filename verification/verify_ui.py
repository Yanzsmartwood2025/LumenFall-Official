
from playwright.sync_api import sync_playwright
import os

def run():
    # Get current working directory for absolute path
    cwd = os.getcwd()
    # Path to index.html
    html_path = f'file://{cwd}/index.html'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use specific viewport to test responsiveness (e.g., iPhone size and Desktop)

        # Scenario 1: Desktop (4K-ish)
        context_desktop = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page_desktop = context_desktop.new_page()
        page_desktop.goto(html_path)

        # Wait for splash screen to fade (script sets splashDuration to 0 if sessionStorage set,
        # but here we are fresh. Let's force hide it via JS or wait)
        # We can bypass splash logic by injecting sessionStorage before reload, or just waiting.
        # Let's wait a bit.
        page_desktop.wait_for_timeout(4500)

        # Take screenshot of Desktop
        page_desktop.screenshot(path='verification/desktop_view.png')

        # Scenario 2: Mobile (iPhone vertical)
        context_mobile = browser.new_context(viewport={'width': 390, 'height': 844})
        page_mobile = context_mobile.new_page()
        page_mobile.goto(html_path)
        page_mobile.wait_for_timeout(4500)

        # Take screenshot of Mobile
        page_mobile.screenshot(path='verification/mobile_view.png')

        browser.close()

if __name__ == '__main__':
    run()
