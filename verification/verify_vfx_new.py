from playwright.sync_api import sync_playwright
import time
import os

def verify_vfx():
    with sync_playwright() as p:
        # Disable web security to allow local file asset loading
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'])
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Console logging
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        # Block auth-core.js
        def handle_route(route):
            if "auth-core.js" in route.request.url:
                route.abort()
            else:
                route.continue_()
        page.route("**/*", handle_route)

        # Inject Mock Auth
        page.add_init_script("""
            window.LumenfallAuth = {
                currentUser: { uid: 'mock-user', displayName: 'Tester', photoURL: '' },
                userData: { role: 'tester' },
                onStateChanged: (cb) => {
                    setTimeout(() => cb({ uid: 'mock-user' }, { role: 'tester' }), 100);
                    return () => {};
                }
            };
            window.currentUserData = { role: 'tester', displayName: 'Tester' };
            window.location.replace = (url) => { console.log("Blocked redirect to: " + url); };
        """)

        print("Loading game via file protocol...")
        page.goto('file:///app/Lumenfall-juego/index.html')

        time.sleep(2)

        # Start Button
        if page.is_visible('#start-button'):
            print("Start button visible.")
            page.click('#start-button')
        else:
            print("Start button not found immediately. Checking frames...")
            try:
                page.wait_for_selector('#start-button', state='visible', timeout=5000)
                page.click('#start-button')
            except:
                print("Start button timed out.")
                page.evaluate("document.getElementById('menu-screen').style.display = 'flex';")

        print("Clicking Play...")
        try:
            page.wait_for_selector('#play-button', state='visible', timeout=5000)
            page.click('#play-button')
        except Exception as e:
            print(f"Play button error: {e}")

        # Wait for canvas
        print("Waiting for canvas...")
        try:
            page.wait_for_selector('#bg-canvas', state='visible', timeout=10000)
        except:
             print("Canvas not visible? Taking screenshot.")

        print("Game loaded. Sleeping 2s...")
        time.sleep(2)

        # Check if Player class exists
        player_exists = page.evaluate("typeof Player !== 'undefined'")
        print(f"Player class defined: {player_exists}")

        # --- Test 1: Projectile (Shoot) ---
        print("Testing Projectile VFX...")
        try:
            # Use global variables directly (scene, player, renderer)
            page.evaluate("""
                if (window.animationFrameId) cancelAnimationFrame(window.animationFrameId);
                window.isPaused = true;

                // Assuming 'player' variable is global
                if (typeof player === 'undefined' || !player) player = new Player();

                // Clear projectiles
                // window.allProjectiles (const?) -> const allProjectiles = []
                // We can push to it.
                if (typeof allProjectiles !== 'undefined') allProjectiles.length = 0;

                const startPos = player.mesh.position.clone();
                startPos.x += 5;
                startPos.y += 1;

                // Use 'scene' global variable
                const proj = new Projectile(scene, startPos, new THREE.Vector2(1, 0));
                if (typeof allProjectiles !== 'undefined') allProjectiles.push(proj);

                proj.update(0.016);

                renderer.render(scene, camera);
            """)
            time.sleep(0.5)
            page.screenshot(path='verification/vfx_projectile.png')
            print("Captured Projectile: verification/vfx_projectile.png")
        except Exception as e:
            print(f"Error in Projectile Test: {e}")

        # --- Test 2: Charge (Aura) ---
        print("Testing Charge VFX...")
        try:
            page.evaluate("""
                player.currentState = 'attacking';
                player.auraGroup.visible = true;
                player.updateAura(0.1);
                renderer.render(scene, camera);
            """)
            time.sleep(0.5)
            page.screenshot(path='verification/vfx_charge.png')
            print("Captured Charge: verification/vfx_charge.png")
        except Exception as e:
             print(f"Error in Charge Test: {e}")

        browser.close()

if __name__ == "__main__":
    verify_vfx()
