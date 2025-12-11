from playwright.sync_api import sync_playwright

def verify_auth_integration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Verificar Root index.html
        print("Checking Root index.html...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_load_state("networkidle")

        # Verificar que auth-core.js se cargó (LumenfallAuth existe)
        is_auth_loaded = page.evaluate("() => typeof window.LumenfallAuth !== 'undefined'")
        print(f"LumenfallAuth loaded in Root: {is_auth_loaded}")

        # Verificar botones de login
        google_btn = page.query_selector("#google-login")
        print(f"Google Login Button present in Root: {google_btn is not None}")

        page.screenshot(path="verification/root_auth.png")

        # 2. Verificar Armeria
        print("Checking Armeria/index.html...")
        page.goto("http://localhost:8000/Armeria/index.html")
        page.wait_for_load_state("networkidle")

        is_auth_loaded_armeria = page.evaluate("() => typeof window.LumenfallAuth !== 'undefined'")
        print(f"LumenfallAuth loaded in Armeria: {is_auth_loaded_armeria}")

        # Verificar nuevo botón de usuario
        user_btn = page.query_selector("#user-btn")
        print(f"User Button present in Armeria: {user_btn is not None}")

        page.screenshot(path="verification/armeria_auth.png")

        # 3. Verificar Musica
        print("Checking Musica/index.html...")
        page.goto("http://localhost:8000/Musica/index.html")
        page.wait_for_load_state("networkidle")

        is_auth_loaded_musica = page.evaluate("() => typeof window.LumenfallAuth !== 'undefined'")
        print(f"LumenfallAuth loaded in Musica: {is_auth_loaded_musica}")

        page.screenshot(path="verification/musica_auth.png")

        browser.close()

if __name__ == "__main__":
    verify_auth_integration()
