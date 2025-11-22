
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 720})

    # Go to the game page
    page.goto("http://localhost:8080/Lumenfall-juego/index.html")

    # Wait for start button and click it
    page.wait_for_selector("#start-button")
    page.click("#start-button")

    # Wait for the menu screen to appear (it has a transition)
    # The menu screen id is #menu-screen
    # It starts with display: none, then flex + opacity 0 -> 1

    # Wait for display: flex
    page.wait_for_selector("#menu-screen", state="visible", timeout=10000)

    # Wait a bit for opacity transition (1s in CSS for intro, 0.5s for menu)
    page.wait_for_timeout(2000)

    # Take screenshot of the menu
    page.screenshot(path="verification/menu_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
