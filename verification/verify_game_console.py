
import os
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))

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
        # wait a bit
        time.sleep(3)

        # Check Rendering Info
        render_info = page.evaluate("""() => {
            const info = {};
            if (window.renderer) {
                info.frame = window.renderer.info.render.frame;
            }
            return info;
        }""")
        print(f"Render Info: {render_info}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
