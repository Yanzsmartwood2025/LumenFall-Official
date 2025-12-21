from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        # Go to game page
        print("Navigating...")
        page.goto("http://localhost:8080/Lumenfall-juego/index.html")

        # Wait for game script to load
        page.wait_for_timeout(2000)

        try:
            # Check variables directly in the page context
            ppu = page.evaluate("PIXELS_PER_UNIT")
            print(f"PIXELS_PER_UNIT: {ppu}")

            urls = page.evaluate("assetUrls")
            print(f"Asset Projectile: {urls.get('projectileSprite')}")

            # Check if Projectile class is defined
            proj_defined = page.evaluate("typeof Projectile !== 'undefined'")
            print(f"Projectile Class Defined: {proj_defined}")

        except Exception as e:
            print(f"Verification Failed: {e}")

        browser.close()

if __name__ == "__main__":
    run()
