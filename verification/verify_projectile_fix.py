from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    # Use absolute path for robustness
    cwd = os.getcwd()
    file_url = f"file://{cwd}/Lumenfall-juego/index.html"

    print(f"Loading: {file_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-swiftshader",
                "--autoplay-policy=no-user-gesture-required",
                "--disable-web-security"
            ]
        )
        # Grant permissions to avoid prompts, though autoplay is handled by args
        context = browser.new_context(
            permissions=['microphone'] # Sometimes requested by audio context
        )
        page = context.new_page()

        # Route Auth
        page.route("**/auth-core.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="""
                window.LumenfallAuth = {
                    currentUser: { uid: 'test-user', displayName: 'Test User', email: 'test@example.com' },
                    loginWithGoogle: () => {},
                    loginWithGithub: () => {},
                    sendMagicLink: () => {},
                    finishMagicLinkSignIn: () => {},
                    signOut: () => {},
                    onAuthStateChanged: (cb) => cb({ uid: 'test-user', displayName: 'Test User' })
                };
            """
        ))

        try:
            page.goto(file_url)

            # Start Game Sequence
            print("Waiting for Splash Screen...")
            splash = page.wait_for_selector('#start-button', state='visible', timeout=5000)
            splash.click()

            print("Waiting for Play Button...")
            play_btn = page.wait_for_selector('#play-button', state='visible', timeout=5000)
            # Ensure it's clickable
            time.sleep(1)
            play_btn.click()

            print("Game Started. Waiting for initialization...")
            # Wait for player to exist
            page.wait_for_function("() => window.player && window.player.mesh")

            # Inject Test Logic: Fire multiple projectiles
            print("Firing projectiles...")
            page.evaluate("""
                window.testProjectiles = [];
                // Fire 3 projectiles with delay
                window.player.shoot({x: 1, y: 0});
                setTimeout(() => window.player.shoot({x: 1, y: 0}), 200);
                setTimeout(() => window.player.shoot({x: 1, y: 0}), 400);
            """)

            time.sleep(1) # Let them fly

            # Verify Projectile Texture UVs and IDs
            result = page.evaluate("""
                () => {
                    const projectiles = window.allProjectiles;
                    if (projectiles.length < 2) return "Not enough projectiles spawned";

                    const p1 = projectiles[0];
                    const p2 = projectiles[1];

                    // Check if textures are different instances (cloned)
                    const isTextureDifferent = p1.mesh.material.map.uuid !== p2.mesh.material.map.uuid;

                    // Check Z offsets
                    const z1 = p1.zOffset;

                    return {
                        count: projectiles.length,
                        uniqueTextures: isTextureDifferent,
                        zOffset: z1,
                        // Check if UVs are animating independently (might be hard if they sync by chance, but uniqueness is key)
                        p1_uuid: p1.mesh.material.map.uuid,
                        p2_uuid: p2.mesh.material.map.uuid
                    };
                }
            """)

            print("Verification Result:", result)

            if isinstance(result, str):
                print("FAILURE:", result)
                return False

            if not result['uniqueTextures']:
                print("FAILURE: Textures are NOT unique. Cloning failed.")
                return False

            if abs(result['zOffset'] - (-0.01)) > 0.001:
                print(f"FAILURE: Z-Offset is {result['zOffset']}, expected -0.01")
                return False

            print("SUCCESS: Projectiles have unique textures and correct Z-offset.")
            return True

        except Exception as e:
            print(f"Error during verification: {e}")
            return False
        finally:
            browser.close()

if __name__ == "__main__":
    if run_verification():
        exit(0)
    else:
        exit(1)
