from playwright.sync_api import sync_playwright, expect
import time
import re

def verify_lumenfall(page):
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")
    page.click("#start-button")
    time.sleep(1.5)
    page.click("#play-button")
    time.sleep(3)

    # Check text
    expect(page.locator("#btn-attack")).to_contain_text("Recargar")
    print("Text verified.")

    # Trigger mousedown
    page.evaluate("""
        const btn = document.getElementById('btn-attack');
        const ev = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
        btn.dispatchEvent(ev);
    """)
    time.sleep(0.5)

    # Capture screenshot (this is the key proof)
    page.screenshot(path="verification/lumenfall_final.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 800, 'height': 400})
        page = context.new_page()
        try:
            verify_lumenfall(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/lumenfall_final.png") # Fallback
        finally:
            browser.close()
