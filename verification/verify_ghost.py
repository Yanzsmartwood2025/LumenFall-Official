from playwright.sync_api import sync_playwright
import time

def verify_ghost_npc():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        page.wait_for_selector("#start-button", state="visible")
        page.click("#start-button")

        page.wait_for_selector("#play-button", state="visible")
        page.click("#play-button")

        page.wait_for_selector("#bg-canvas", state="visible")
        page.wait_for_timeout(2000)

        ghost_info = page.evaluate("""() => {
            const scene = window.scene;
            if (!scene) return "No Scene";

            const ghosts = [];
            scene.children.forEach(child => {
                if (child.isMesh && child.geometry.type === "PlaneGeometry") {
                     // Check material map safely
                     let src = "";
                     if (child.material && child.material.map && child.material.map.image) {
                         src = child.material.map.image.src || "";
                     }

                     if (src.includes("enemigo-x")) {
                         ghosts.push({x: child.position.x, y: child.position.y, src: src});
                     }
                }
            });
            return ghosts;
        }""")

        print(f"Ghosts found: {ghost_info}")

        # Move player and camera to see the ghost
        # Gate 2 is at -30.
        page.evaluate("if(window.player) { window.player.mesh.position.x = -30; window.camera.position.x = -30; }")

        page.wait_for_timeout(1000)
        page.screenshot(path="verification/ghost_npc.png")

        browser.close()

if __name__ == "__main__":
    verify_ghost_npc()
