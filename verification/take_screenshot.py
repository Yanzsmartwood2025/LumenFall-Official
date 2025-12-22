from playwright.sync_api import sync_playwright

def verify_frontend_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=[
                "--autoplay-policy=no-user-gesture-required",
                "--enable-unsafe-swiftshader"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        # Mock AudioContext state to force "Cargando..."
        page.add_init_script("""
            const originalAudioContext = window.AudioContext || window.webkitAudioContext;
            window.AudioContext = class extends originalAudioContext {
                constructor() {
                    super();
                    this._state = 'suspended';
                }
                get state() { return this._state; }
                resume() {
                    this._state = 'running';
                    return super.resume();
                }
            };
            window.webkitAudioContext = window.AudioContext;
        """)

        # Load page
        import os
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Click Empezar
        page.click("#start-button")
        page.wait_for_selector("#play-button", state="visible")

        # Take screenshot of BEFORE state
        page.screenshot(path="verification/before_click.png")

        # Click JUGAR
        page.click("#play-button")

        # Take screenshot of AFTER state (Immediate feedback)
        # We need to capture it fast.
        page.screenshot(path="verification/after_click.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend_changes()
