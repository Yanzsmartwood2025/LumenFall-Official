import time
from playwright.sync_api import sync_playwright

def verify_vfx():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        # Ensure landscape
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        print("Navigating to game...")
        try:
            page.goto("http://localhost:8080/Lumenfall-juego/index.html")

            # Check dimensions
            dims = page.evaluate("() => ({w: window.innerWidth, h: window.innerHeight})")
            print(f"Viewport: {dims}")

            # Check rotate overlay
            overlay_disp = page.evaluate("window.getComputedStyle(document.getElementById('rotate-device-overlay')).display")
            print(f"Rotate Overlay Display: {overlay_disp}")

            print("Waiting for start button...")
            try:
                page.wait_for_selector('#start-button', state='visible', timeout=5000)
                print("Start button visible.")
            except Exception as e:
                print(f"Start button wait failed: {e}")
                page.screenshot(path="verification/debug_start_fail.png")
                # Force click via JS if needed

            print("Clicking start button...")
            page.click('#start-button', force=True)

            print("Waiting for play button...")
            # Wait for transition
            time.sleep(2)
            # Force intro fade if needed (game.js logic might hang if image load fails)

            # Check if Menu is visible
            menu_disp = page.evaluate("document.getElementById('menu-screen').style.display")
            menu_op = page.evaluate("document.getElementById('menu-screen').style.opacity")
            print(f"Menu Display: {menu_disp}, Opacity: {menu_op}")

            if menu_disp == 'none':
                 print("Menu not visible yet. Forcing transition end...")
                 # Maybe intro image didn't load?
                 # Intro image is 'assets/ui/Intro.jpg'

            page.wait_for_selector('#play-button', state='visible', timeout=5000)
            page.click('#play-button', force=True)

            print("Waiting for game...")
            # Wait for canvas
            page.wait_for_selector('#bg-canvas', state='visible', timeout=10000)

            # Wait for player
            print("Waiting for player object...")
            page.wait_for_function("window.player !== undefined")

            time.sleep(2)

            # 1. Test Projectile Right
            print("Testing Projectile Right...")
            page.evaluate("window.player.shoot(new THREE.Vector2(1, 0))")
            time.sleep(0.1)
            page.screenshot(path="verification/vfx_projectile_right.png")
            print("Screenshot saved: verification/vfx_projectile_right.png")

            rot_z = page.evaluate("""
                (() => {
                    // Try to find projectile in scene.children
                    const proj = window.scene.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry' && c.material && c.material.map && c.material.map.image && c.material.map.image.src && c.material.map.image.src.includes('proyectil'));
                    // Note: 'proyectil-1.jpg' is used.
                    if (proj) return proj.rotation.z;
                    return 'Not Found';
                })()
            """)
            print(f"Rotation Z (Right): {rot_z}")

            # 2. Test Projectile Up
            print("Testing Projectile Up...")
            page.evaluate("window.player.shoot(new THREE.Vector2(0, 1))")
            time.sleep(0.1)
            page.screenshot(path="verification/vfx_projectile_up.png")
            print("Screenshot saved: verification/vfx_projectile_up.png")

            rot_z_up = page.evaluate("""
                (() => {
                    // Find the NEWEST projectile?
                    // Let's just find one that has rotation close to PI/2 (1.57) or look for multiple.
                    // For verification script, we just assume the one found is valid.
                    // We can filter by Y velocity > 0 in logic, but here we just check rotation.
                    const projs = window.scene.children.filter(c => c.geometry && c.geometry.type === 'PlaneGeometry' && c.material && c.material.map && c.material.map.image && c.material.map.image.src && c.material.map.image.src.includes('proyectil'));
                    if (projs.length > 0) return projs[projs.length-1].rotation.z;
                    return 'Not Found';
                })()
            """)
            print(f"Rotation Z (Up): {rot_z_up}")

            # 3. Test Aura
            print("Testing Aura...")
            page.evaluate("window.player.currentState = 'attacking'")
            page.evaluate("window.isAttackButtonPressed = true")
            time.sleep(0.2)
            page.screenshot(path="verification/vfx_aura.png")
            print("Screenshot saved: verification/vfx_aura.png")

        except Exception as e:
            print(f"ERROR: {e}")
            page.screenshot(path="verification/error_state.png")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_vfx()
