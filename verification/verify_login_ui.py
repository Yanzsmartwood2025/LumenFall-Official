from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Index...")
        page.goto("http://localhost:8080/index.html")
        page.wait_for_selector("#login-buttons")

        # 1. Verify Initial State (Landing)
        print("Taking Landing Screenshot...")
        page.screenshot(path="verification/1_landing_page.png")

        # 2. Verify Modal Opening
        print("Opening Email Modal...")
        page.click("#open-email-modal")
        page.wait_for_selector("#auth-modal:not(.hidden)")
        page.wait_for_timeout(500) # Wait for animation
        print("Taking Modal Screenshot...")
        page.screenshot(path="verification/2_login_modal.png")

        # CLOSE MODAL
        # Note: Playwright's wait_for_selector checks for "visible" by default.
        # Waiting for "#auth-modal.hidden" will fail because the element is hidden (not visible).
        # We need to wait for it to be attached or check state differently.
        # Actually, clicking close button adds the class 'hidden'.

        print("Closing Modal...")
        page.click("#close-modal-btn")
        # Wait for the element to HAVE the class hidden
        page.wait_for_function("document.getElementById('auth-modal').classList.contains('hidden')")
        page.wait_for_timeout(200)

        # 3. Verify Logged In State (Mocking)
        print("Mocking Logged In State...")
        page.evaluate("""
            const user = { email: 'test@example.com', photoURL: null };
            const userData = { gameCode: '123456' };

            // Ensure modal is hidden just in case
            document.getElementById('auth-modal').classList.add('hidden');

            // Simulate the callback logic
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('user-avatar-container').classList.remove('hidden');

            document.getElementById('menu-user-email').textContent = user.email;
            document.getElementById('menu-game-code').textContent = userData.gameCode;
        """)
        page.wait_for_timeout(500)
        print("Taking Logged In Screenshot...")
        page.screenshot(path="verification/3_logged_in_avatar.png")

        # 4. Verify Dropdown Menu
        print("Opening Dropdown...")
        page.click("#user-avatar-btn")
        page.wait_for_selector("#user-dropdown:not(.hidden)")
        page.wait_for_timeout(500)
        print("Taking Menu Screenshot...")
        page.screenshot(path="verification/4_user_menu.png")

        browser.close()

if __name__ == "__main__":
    verify_ui()
