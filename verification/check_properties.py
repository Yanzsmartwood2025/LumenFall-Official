import asyncio
from playwright.async_api import async_playwright

async def verify_frontend():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security",
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = await browser.new_context()
        page = await context.new_page()

        # Mock Auth
        await page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="window.LumenfallAuth = { currentUser: { uid: 'test-user', displayName: 'TEST' }, onAuthStateChanged: (cb) => cb({ uid: 'test-user' }) };"
        ))

        # Navigate
        print("Navigating...")
        await page.goto("file:///app/Lumenfall-juego/index.html")

        # Click Start
        try:
            await page.wait_for_selector("#start-button", timeout=5000)
            await page.click("#start-button")
        except:
            print("Start button skipped or missing")

        # Click Play
        try:
            await page.wait_for_selector("#play-button", state="visible", timeout=5000)
            await page.wait_for_function("document.getElementById('play-button').textContent.includes('JUGAR') || document.getElementById('play-button').textContent.includes('PLAY')", timeout=10000)
            await page.click("#play-button")
        except Exception as e:
            print(f"Play button error: {e}")

        # Wait for Player
        print("Waiting for player...")
        await page.wait_for_function("window.player && window.player.mesh", timeout=10000)

        # Inspect Player Properties
        print("Inspecting Player properties...")
        props = await page.evaluate("""() => {
            return {
                hasIdleSequence: !!window.player.idleSequence,
                idleSequence: window.player.idleSequence,
                currentSequenceIndex: window.player.currentSequenceIndex,
                currentState: window.player.currentState
            };
        }""")

        print(f"Properties found: {props}")

        if not props['hasIdleSequence']:
            print("ERROR: idleSequence is missing!")
            exit(1)

        if props['idleSequence'] != [0, 1, 2, 1, 2, 1, 2, 3]:
            print(f"ERROR: Incorrect sequence: {props['idleSequence']}")
            exit(1)

        print("SUCCESS: Code properties verified.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_frontend())
