from playwright.sync_api import sync_playwright, expect
import time

def verify_ui_fixes():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--enable-unsafe-swiftshader",
                "--enable-webgl",
                "--ignore-gpu-blocklist"
            ]
        )
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        page.route("**/*.mp3", lambda route: route.abort())
        page.goto("file:///app/Lumenfall-juego/index.html")

        try:
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")
        except:
            pass
        time.sleep(2)
        try:
             page.eval_on_selector("#play-button", "el => el.click()")
        except:
             page.click("#play-button")
        time.sleep(5)

        page.screenshot(path="verification/ui_fix_verification.png")
        browser.close()

if __name__ == "__main__":
    verify_ui_fixes()
