from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 720})

        context.route("**/auth-core.js", lambda route: route.fulfill(
            status=200, content_type="application/javascript",
            body="window.LumenfallAuth={currentUser:{uid:'test'},onStateChanged:c=>c({uid:'test'})};window.currentUserData={uid:'test'};"
        ))

        page = context.new_page()
        file_path = os.path.abspath("Lumenfall-juego/index.html")
        page.goto(f"file://{file_path}")

        page.wait_for_selector("#start-button")
        page.click("#start-button")

        page.wait_for_selector("#play-button", state="visible")
        page.wait_for_function("document.getElementById('play-button').textContent === 'JUGAR'")
        page.click("#play-button")

        page.wait_for_function("window.player && window.player.mesh")

        # Inject and Verify
        result = page.evaluate("""
            (() => {
                const scene = window.player.mesh.parent;
                const startPos = new THREE.Vector3(0, 2, 0);
                window.testProjectile = new HUDProjectile(scene, startPos, 'health');

                return {
                    width: window.testProjectile.sprite.style.width,
                    height: window.testProjectile.sprite.style.height,
                    mixBlendMode: window.testProjectile.sprite.style.mixBlendMode
                };
            })()
        """)

        print(f"VERIFICATION RESULT: {result}")

        # Take Screenshot for record
        page.screenshot(path=os.path.abspath("verification/hud_projectile_verify_final.png"))

        browser.close()

if __name__ == "__main__":
    run()
