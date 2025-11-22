import http.server
import socketserver
import threading
import time
import os
from playwright.sync_api import sync_playwright

# Configuration
PORT = 8081
DIRECTORY = "."

# Start a simple HTTP server
def start_server():
    os.chdir(DIRECTORY)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

def verify_menu():
    # Start server in a background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(2) # Wait for server to start

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Test 1: Mobile Landscape (iPhone SE landscape approx)
        # This should NOT trigger the portrait overlay
        context_mobile = browser.new_context(viewport={'width': 667, 'height': 375})
        page = context_mobile.new_page()

        try:
            print("Navigating to game (Mobile Landscape)...")
            page.goto(f"http://localhost:{PORT}/Lumenfall-juego/index.html")

            # Click "Empezar"
            print("Clicking Start button...")
            page.click("#start-button")

            # Wait for menu screen to be visible
            print("Waiting for menu screen...")
            page.wait_for_selector("#menu-screen", state="visible", timeout=10000)
            time.sleep(1)

            print("Taking screenshot Mobile Landscape...")
            page.screenshot(path="verification/menu_screenshot_mobile_landscape.png")

        except Exception as e:
            print(f"Error Mobile: {e}")
            page.screenshot(path="verification/error_mobile.png")

        # Test 2: Desktop (16:9)
        context_desktop = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page_desktop = context_desktop.new_page()
        try:
            print("Navigating to game (Desktop)...")
            page_desktop.goto(f"http://localhost:{PORT}/Lumenfall-juego/index.html")
            page_desktop.click("#start-button")
            page_desktop.wait_for_selector("#menu-screen", state="visible", timeout=10000)
            time.sleep(1)
            print("Taking screenshot Desktop...")
            page_desktop.screenshot(path="verification/menu_screenshot_desktop.png")
        except Exception as e:
            print(f"Error Desktop: {e}")

        browser.close()

if __name__ == "__main__":
    verify_menu()
