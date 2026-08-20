import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    context = browser.new_context()
    page = context.new_page()

    # Load game
    # Use absolute path for robustness in sandbox
    page.goto("http://localhost:8080/Lumenfall-juego/index.html")

    print("Loading game...")
    # Wait for start button and click
    try:
        page.wait_for_selector("#start-button", state="visible", timeout=5000)
        page.click("#start-button")
        print("Clicked Start Button")
    except:
        print("Start button not found or timeout")

    # Wait for play button (Main Menu)
    try:
        page.wait_for_selector("#play-button", state="visible", timeout=5000)
        # Mock interactions to bypass potential audio locks or transitions
        page.evaluate("if(window.startGame) window.startGame();")
        print("Triggered startGame()")
    except:
        print("Play button not found or timeout")

    # Wait for game to load (player exists)
    page.wait_for_function("window.player !== undefined", timeout=10000)
    print("Game Loaded")

    # Inject Test Projectiles
    # We spawn one of each type
    page.evaluate("""
        // Stop game loop to freeze scene but allow CSS anims? No, CSS anims run independently.
        // But HUDProjectile.update runs in animate loop.
        // We will override the update method of the instances to stop movement.

        const center = new THREE.Vector3(0,0,0);

        const p1 = new HUDProjectile(window.scene, center, 'health');
        p1.duration = 9999;
        p1.container.style.left = '30%';
        p1.container.style.top = '50%';
        // Override update so it doesn't move but DOES animate frame
        p1.update = function(dt) {
            this.frameTimer += dt;
            if (this.frameTimer > 0.1) {
                this.frameTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                this.updateSpriteFrame();
            }
            return true;
        };
        window.allProjectiles.push(p1);

        const p2 = new HUDProjectile(window.scene, center, 'power');
        p2.duration = 9999;
        p2.container.style.left = '50%';
        p2.container.style.top = '50%';
        p2.update = function(dt) {
            this.frameTimer += dt;
            if (this.frameTimer > 0.1) {
                this.frameTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                this.updateSpriteFrame();
            }
            return true;
        };
        window.allProjectiles.push(p2);

        const p3 = new HUDProjectile(window.scene, center, 'soul');
        p3.duration = 9999;
        p3.container.style.left = '70%';
        p3.container.style.top = '50%';
        p3.update = function(dt) {
            this.frameTimer += dt;
            if (this.frameTimer > 0.1) {
                this.frameTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                this.updateSpriteFrame();
            }
            return true;
        };
        window.allProjectiles.push(p3);
    """)

    # Wait a moment for animations to play
    time.sleep(1)

    # Screenshot
    page.screenshot(path="projectile_check.png")
    print("Screenshot saved to projectile_check.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
