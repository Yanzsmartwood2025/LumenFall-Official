from playwright.sync_api import sync_playwright, expect
import time
import os

def verify_fire_buttons():
    # Use absolute path for robustness
    file_path = f"file://{os.path.abspath('Lumenfall-juego/index.html')}"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--enable-unsafe-swiftshader",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                 "--autoplay-policy=no-user-gesture-required"
            ]
        )
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Abort audio to speed up load/prevent issues
        page.route("**/*.mp3", lambda route: route.abort())
        page.route("**/*.wav", lambda route: route.abort())

        print(f"Navigating to {file_path}")
        page.goto(file_path)

        # Handle Start Button
        try:
            print("Waiting for start button...")
            page.wait_for_selector("#start-button", state="visible", timeout=5000)
            page.click("#start-button")
            print("Clicked start button")
        except Exception as e:
            print(f"Start button interaction note: {e}")

        time.sleep(1)

        # Handle Play Button (if menu appears)
        try:
            print("Waiting for play button...")
            # Often the menu fades in, so wait for it
            page.wait_for_selector("#play-button", state="visible", timeout=5000)
            page.click("#play-button")
            print("Clicked play button")
        except Exception as e:
            print(f"Play button interaction note: {e}")

        # Wait for game UI to load (check for controls)
        try:
            page.wait_for_selector("#controls", state="visible", timeout=10000)
            print("Controls visible")
        except Exception as e:
             print(f"Controls did not become visible: {e}")
             page.screenshot(path="verification/fire_buttons_error.png")
             browser.close()
             return

        # --- VERIFICATION LOGIC ---

        # 1. Verify Shoot Button
        shoot_img = page.locator("#btn-shoot img")
        expect(shoot_img).to_be_visible()

        # Check Src
        src_shoot = shoot_img.get_attribute("src")
        print(f"Shoot button src: {src_shoot}")
        if "fuego-de-botones.jpg" not in src_shoot:
            print("FAILURE: Shoot button does not use correct image")
        else:
            print("SUCCESS: Shoot button uses correct image")

        # Check Mix Blend Mode
        blend_shoot = shoot_img.evaluate("el => window.getComputedStyle(el).mixBlendMode")
        print(f"Shoot button mix-blend-mode: {blend_shoot}")
        if blend_shoot != "screen":
            print("FAILURE: Shoot button mix-blend-mode is not 'screen'")
        else:
            print("SUCCESS: Shoot button mix-blend-mode is 'screen'")

        # 2. Verify Attack Button (Carousel)
        ring_imgs = page.locator(".flame-ring img")
        count = ring_imgs.count()
        print(f"Found {count} images in flame ring")

        if count != 5:
             print("FAILURE: Did not find 5 images in flame ring")

        for i in range(count):
            img = ring_imgs.nth(i)
            src_ring = img.get_attribute("src")
            blend_ring = img.evaluate("el => window.getComputedStyle(el).mixBlendMode")

            if "fuego-de-botones.jpg" not in src_ring:
                 print(f"FAILURE: Ring image {i} has wrong src: {src_ring}")

            if blend_ring != "screen":
                 print(f"FAILURE: Ring image {i} has wrong blend mode: {blend_ring}")

        print("SUCCESS: Verified all ring images")

        # Take screenshot for visual confirmation
        page.screenshot(path="verification/fire_buttons_verified.png")
        print("Screenshot saved to verification/fire_buttons_verified.png")

        browser.close()

if __name__ == "__main__":
    verify_fire_buttons()
