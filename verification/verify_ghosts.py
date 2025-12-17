from playwright.sync_api import sync_playwright
import time

def verify_ghosts():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for Start
        page.locator("#start-button").wait_for(state="visible")
        page.locator("#start-button").click()

        # Wait for Play
        page.locator("#play-button").wait_for(state="visible", timeout=5000)
        page.evaluate("document.getElementById('play-button').click()")

        # Wait for Player
        page.wait_for_function("!!window.player", timeout=10000)
        page.wait_for_timeout(2000)

        # Pause
        page.evaluate("window.isPaused = true; cancelAnimationFrame(window.animationFrameId);")

        # Debug: List all children
        print("Inspecting scene children...")
        children_info = page.evaluate("""
            window.scene.children.map(c => {
                return {
                    type: c.type,
                    geo: c.geometry ? c.geometry.type : 'none',
                    params: c.geometry ? c.geometry.parameters : 'none',
                    x: c.position.x
                }
            })
        """)
        for i, info in enumerate(children_info):
            print(f"Child {i}: {info}")

        # 1. Verify DecorGhost at Center
        decor_ghosts = page.evaluate("""
            window.scene.children.filter(c =>
                c.geometry &&
                c.geometry.parameters &&
                c.geometry.parameters.width === 4.2 &&
                Math.abs(c.position.x) < 5
            ).length
        """)
        print(f"DecorGhosts at Center: {decor_ghosts}")

        # 2. Verify WalkingMonster at Gate 2 (-30)
        monsters = page.evaluate("""
            window.scene.children.filter(c =>
                c.geometry &&
                c.geometry.parameters &&
                c.geometry.parameters.width === 4.4 &&
                c.geometry.parameters.height === 5.6 &&
                Math.abs(c.position.x - (-30)) < 5
            ).length
        """)
        print(f"WalkingMonsters at Gate 2: {monsters}")

        # Screenshots
        page.screenshot(path="verification/center_ghost.png")
        page.evaluate("window.camera.position.x = -30; window.renderer.render(window.scene, window.camera);")
        page.screenshot(path="verification/gate2_monster.png")

        browser.close()

if __name__ == "__main__":
    verify_ghosts()
