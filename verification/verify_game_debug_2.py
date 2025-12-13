
import os
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    try:
        print("Navigating...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        print("Clicking Start...")
        page.wait_for_selector("#start-button", state="visible")
        page.click("#start-button")

        print("Clicking Play...")
        page.wait_for_selector("#play-button", state="visible")
        time.sleep(1)
        page.click("#play-button")

        print("Waiting for game loop...")
        page.wait_for_function("() => window.player !== undefined")
        time.sleep(2)

        # Check Rendering Info
        render_info = page.evaluate("""() => {
            const info = {};
            if (window.renderer) {
                info.frame = window.renderer.info.render.frame;
                info.calls = window.renderer.info.render.calls;
            }
            if (window.camera) {
                info.cameraPos = window.camera.position;
                info.cameraRot = window.camera.rotation;
            }
            info.isPaused = window.isPaused; // Need to expose isPaused? No, it's local.
            // Check overlays
            const intro = document.getElementById('intro-screen');
            const menu = document.getElementById('menu-screen');
            const transition = document.getElementById('transition-overlay');
            info.overlays = {
                intro: { display: intro.style.display, opacity: intro.style.opacity, zIndex: getComputedStyle(intro).zIndex },
                menu: { display: menu.style.display, opacity: menu.style.opacity, zIndex: getComputedStyle(menu).zIndex },
                transition: { display: transition.style.display, opacity: getComputedStyle(transition).opacity, zIndex: getComputedStyle(transition).zIndex, classList: transition.className }
            };
            return info;
        }""")
        print(f"Render Info: {render_info}")

        page.screenshot(path="/app/verification/game_debug_2.png")
        print("Screenshot saved.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="/app/verification/error_debug_2.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
