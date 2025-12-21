from playwright.sync_api import sync_playwright
import time

def verify_projectile_impact():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create context without autoplay permission to match memory instructions,
        # but since we are automating, we might need to handle audio context manually.
        context = browser.new_context()
        page = context.new_page()

        # Mock LumenfallAuth to bypass login
        page.add_init_script("""
            window.LumenfallAuth = {
                currentUser: { uid: 'test-user', displayName: 'Test User', photoURL: 'test.jpg' },
                userData: { gameCode: '123456' },
                onAuthStateChanged: (callback) => callback({ uid: 'test-user' }),
                getAuth: () => ({}),
                signInWithPopup: () => Promise.resolve(),
                signOut: () => Promise.resolve()
            };
            window.currentUserData = { displayName: 'Test User', photoURL: 'test.jpg' };
        """)

        # Load game
        # Assuming we can load the file directly. Relative path might be tricky depending on server.
        # But instructions imply we should start a server or use file:// if static.
        # This is a static game. Let's try file:// first.
        import os
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/Lumenfall-juego/index.html")

        # Wait for Start Button
        page.wait_for_selector('#start-button', state='visible')

        # Click Start (Interact to resume audio context, though headless usually ignores)
        page.click('#start-button')

        # Wait for Menu (Play Button)
        page.wait_for_selector('#play-button', state='visible')

        # Click Play
        page.click('#play-button')

        # Wait for Canvas
        page.wait_for_selector('#bg-canvas', state='visible')

        # Wait for Player initialization
        page.wait_for_function("window.player !== undefined")

        # Inject Test Logic:
        # 1. Force facing right
        # 2. Spawn Projectile
        # 3. Wait for Impact state
        # 4. Take screenshot of particles

        print("Spawning projectile...")
        page.evaluate("""
            window.player.isFacingLeft = false;
            window.player.shoot({x: 1, y: 0});
        """)

        # Wait a bit for projectile to travel and impact.
        # Speed 0.5. Walls are far?
        # Let's force impact by spawning enemy or wall?
        # Or just force projectile position?
        # Better: Spawn a wall near player?
        # Or just wait.
        # To test impact, we can manually trigger it or let it hit the wall.
        # Wall is at x=60 (bound). Player at 0. Distance 60. Speed 0.5. Time 120s. Too long.
        # Let's manually trigger impact on the projectile.

        time.sleep(1) # Let it spawn and fly a bit (drill effect)

        print("Checking flight state...")
        flight_state = page.evaluate("""
            () => {
                const proj = window.allProjectiles[0];
                return proj ? proj.state : 'No Projectile';
            }
        """)
        print(f"State: {flight_state}")

        if flight_state == 'FLIGHT':
             # Take screenshot of Flight (Drill)
             page.screenshot(path="verification/flight_state.png")
             print("Flight screenshot taken.")

        print("Forcing impact...")
        page.evaluate("""
            const proj = window.allProjectiles[0];
            if (proj) proj.triggerImpact();
        """)

        time.sleep(0.1) # Wait for state change and particle spawn

        impact_state = page.evaluate("""
            () => {
                const proj = window.allProjectiles[0];
                return proj ? proj.state : 'No Projectile';
            }
        """)
        print(f"State: {impact_state}")

        # Check particles
        particles_exist = page.evaluate("window.allFlames.some(f => f.constructor.name === 'ImpactParticleSystem')")
        print(f"Particles exist: {particles_exist}")

        # Screenshot Impact
        page.screenshot(path="verification/impact_state.png")
        print("Impact screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_projectile_impact()
