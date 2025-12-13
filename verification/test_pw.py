from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        print("Playwright started")
        browser = p.chromium.launch()
        print("Browser launched")
        page = browser.new_page()
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")
        print("Page loaded")
        title = page.title()
        print(f"Title: {title}")
        browser.close()
except Exception as e:
    print(f"Error: {e}")
