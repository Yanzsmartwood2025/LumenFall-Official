from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    # Bypass Splash Screen logic by pre-setting sessionStorage
    context.add_init_script("window.sessionStorage.setItem('splashSeen', 'true');")

    page = context.new_page()

    # Listen to console to catch JS errors
    page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

    # Navigate to the page
    page.goto("http://localhost:8080/index.html")

    # Force hide splash screen to be absolutely sure
    page.evaluate("document.getElementById('splash-screen').style.display = 'none';")
    page.evaluate("document.getElementById('main-content').style.opacity = '1';")

    # Wait a bit for layout
    page.wait_for_timeout(500)

    # 1. Verification: Loading State (Spinner)
    print("Verifying Loading State...")
    # Reset UI to loading state
    page.evaluate("""
        const spinner = document.getElementById('auth-loading-spinner');
        if(spinner) spinner.style.display = 'block';
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('user-avatar-container').classList.add('hidden');
    """)
    # Screenshot the spinner
    try:
        page.locator("#auth-loading-spinner").screenshot(path="verification/1_spinner_element.png")
        print("Captured 1_spinner_element.png")
    except Exception as e:
        print(f"Error capturing spinner: {e}")

    # 2. Verification: Logged In State (Mystic Avatar)
    print("Verifying Logged In State (Mystic Avatar)...")
    page.evaluate("""
        const userBtn = document.getElementById('user-avatar-btn');
        userBtn.innerHTML = '';

        // Create the mystic avatar div
        const div = document.createElement('div');
        div.className = 'mystic-avatar';
        div.textContent = 'J';

        userBtn.appendChild(div);
        // Remove border from button as mystic avatar has its own
        userBtn.className = "w-12 h-12 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-400";

        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('user-avatar-container').classList.remove('hidden');
        document.getElementById('auth-loading-spinner').style.display = 'none';
        document.getElementById('menu-user-email').textContent = 'test@example.com';
    """)
    # Screenshot the avatar button
    try:
        page.locator("#user-avatar-btn").screenshot(path="verification/2_mystic_avatar_element.png")
        print("Captured 2_mystic_avatar_element.png")
    except Exception as e:
        print(f"Error capturing mystic avatar: {e}")

    # Also capture full header area to see context
    page.screenshot(path="verification/2_logged_in_full.png")

    # 3. Verification: Logged In State (Photo Avatar)
    print("Verifying Logged In State (Photo Avatar)...")
    page.evaluate("""
        const userBtn = document.getElementById('user-avatar-btn');
        userBtn.innerHTML = '';

        const img = document.createElement('img');
        img.src = 'assets/imagenes/icono-inicio-web/icono-joziel-2.png';
        img.className = "w-full h-full object-cover bg-gray-800";

        userBtn.appendChild(img);
        userBtn.className = "w-12 h-12 rounded-full border-2 border-teal-500 overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-400";
    """)
    try:
        page.locator("#user-avatar-btn").screenshot(path="verification/3_photo_avatar_element.png")
        print("Captured 3_photo_avatar_element.png")
    except Exception as e:
        print(f"Error capturing photo avatar: {e}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
