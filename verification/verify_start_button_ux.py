import time
from playwright.sync_api import sync_playwright

def verify_start_button_ux():
    with sync_playwright() as p:
        # Launch browser with arguments to allow audio context
        browser = p.chromium.launch(
            args=[
                "--autoplay-policy=no-user-gesture-required",
                "--enable-unsafe-swiftshader"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        # Mock navigator.vibrate
        page.add_init_script("""
            window.vibrateCalled = false;
            window.navigator.vibrate = (pattern) => {
                window.vibrateCalled = true;
                window.vibratePattern = pattern;
                console.log('Vibrate called with:', pattern);
                return true;
            };

            // Mock AudioContext to spy on resume
            const originalAudioContext = window.AudioContext || window.webkitAudioContext;
            window.audioContextResumeCalled = false;
            window.AudioContext = class extends originalAudioContext {
                constructor() {
                    super();
                    this._state = 'suspended'; // Force suspended state for testing
                }
                get state() {
                    return this._state;
                }
                resume() {
                    window.audioContextResumeCalled = true;
                    console.log('AudioContext.resume called');
                    this._state = 'running';
                    return super.resume();
                }
            };
            window.webkitAudioContext = window.AudioContext;
        """)

        # Load the game page
        import os
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # 1. Click 'Empezar' to get to the menu
        print("Clicking 'Empezar'...")
        page.click("#start-button")

        print("Waiting for 'JUGAR' button...")
        page.wait_for_selector("#play-button", state="visible")

        time.sleep(1)

        # 2. Get initial state
        initial_text = page.inner_text("#play-button")
        print(f"Initial button text: {initial_text}")

        # 3. Click 'JUGAR' and immediately check for UX feedback
        print("Clicking 'JUGAR'...")
        page.click("#play-button")

        # Immediate check
        new_text = page.inner_text("#play-button")
        print(f"Button text after click: {new_text}")

        opacity = page.evaluate("document.getElementById('play-button').style.opacity")
        pointer_events = page.evaluate("document.getElementById('play-button').style.pointerEvents")
        print(f"Button opacity: {opacity}, Pointer Events: {pointer_events}")

        vibrate_called = page.evaluate("window.vibrateCalled")
        resume_called = page.evaluate("window.audioContextResumeCalled")
        print(f"Vibrate called: {vibrate_called}")
        print(f"AudioContext.resume called: {resume_called}")

        # Verification Logic
        errors = []
        if "Cargando" not in new_text and "Loading" not in new_text:
            errors.append("Button text did not change to Loading/Cargando")

        if opacity != "0.5":
            errors.append(f"Button opacity not set to 0.5 (found {opacity})")

        if pointer_events != "none":
            errors.append(f"Button pointer-events not set to none (found {pointer_events})")

        if not vibrate_called:
            errors.append("navigator.vibrate was not called")

        if not resume_called:
            errors.append("AudioContext.resume was not called")

        if not errors:
            print("SUCCESS: Start button UX verification passed!")
        else:
            print("FAILURE: Verification failed with errors:")
            for e in errors:
                print(f" - {e}")
            exit(1)

        browser.close()

if __name__ == "__main__":
    verify_start_button_ux()
