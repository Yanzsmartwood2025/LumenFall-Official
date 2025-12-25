from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    cwd = os.getcwd()
    file_url = f"file://{cwd}/Lumenfall-juego/index.html"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required",
                "--disable-web-security",
                "--allow-file-access-from-files"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        # Mock Auth
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="window.LumenfallAuth = { currentUser: { uid: 'test', displayName: 'Test' }, onAuthStateChanged: (cb) => cb({ uid: 'test', displayName: 'Test' }) };"
        ))

        # Mock Audio loading
        page.add_init_script("""
            window.originalFetch = window.fetch;
            window.fetch = async (url) => {
                if (url.toString().endsWith('.mp3')) {
                    return {
                        ok: true,
                        arrayBuffer: async () => new ArrayBuffer(0)
                    };
                }
                return window.originalFetch(url);
            };
            const originalAudioContext = window.AudioContext || window.webkitAudioContext;
            window.AudioContext = class extends originalAudioContext {
                decodeAudioData(buffer) {
                    return Promise.resolve(this.createBuffer(1, 1, 44100));
                }
            };
            window.webkitAudioContext = window.AudioContext;
        """)

        try:
            page.goto(file_url)
            page.wait_for_selector('#start-button', state='visible').click()
            time.sleep(1)
            page.wait_for_selector('#play-button', state='visible').click()

            # Wait for player
            page.wait_for_function("() => window.player && window.player.mesh", timeout=10000)

            # SAFE Execute
            page.evaluate("""
                if (window.player && window.player.mesh && window.camera) {
                    window.player.mesh.position.set(0, 0.8, 0);
                    window.camera.position.set(0, 6, 14);
                    window.camera.lookAt(0, 3, 0);
                    window.player.shoot({x: 1, y: 0});
                }
            """)

            time.sleep(0.5)

            screenshot_path = f"{cwd}/verification/projectile_visual.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")
            return screenshot_path

        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
