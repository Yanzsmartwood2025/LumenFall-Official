
import os
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    try:
        print("Navigating...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        print("Clicking Start...")
        page.wait_for_selector("#start-button", state="visible")
        page.click("#start-button")

        print("Clicking Play...")
        page.wait_for_selector("#play-button", state="visible")
        # Ensure transition ended
        time.sleep(1)
        page.click("#play-button")

        print("Waiting for game loop...")
        # Wait for player to be defined
        page.wait_for_function("() => window.player !== undefined")

        # Wait a bit for render
        time.sleep(2)

        # Check Scene Info
        scene_info = page.evaluate("""() => {
            const info = {};
            info.childrenCount = window.scene ? window.scene.children.length : -1;
            if (window.player && window.player.mesh) {
                info.playerVisible = window.player.mesh.visible;
                info.playerCulled = window.player.mesh.frustumCulled;
                info.playerPos = window.player.mesh.position;
                info.cameraPos = window.camera ? window.camera.position : null;
            }
            return info;
        }""")
        print(f"Scene Info: {scene_info}")

        # Check Ambient Light
        light_info = page.evaluate("""() => {
            const ambient = window.scene.children.find(c => c.isAmbientLight);
            return ambient ? { color: ambient.color.getHex(), intensity: ambient.intensity } : "No Ambient Light";
        }""")
        print(f"Ambient Light: {light_info}")

        # Check Fog
        fog_info = page.evaluate("""() => window.scene.fog""")
        print(f"Fog: {fog_info}")

        # Screenshot
        output_path = "/app/verification/game_debug.png"
        page.screenshot(path=output_path)
        print(f"Screenshot saved to {output_path}")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="/app/verification/error_debug.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
