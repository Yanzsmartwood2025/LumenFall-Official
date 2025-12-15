from playwright.sync_api import sync_playwright

def verify_fixes(page):
    page.goto("http://localhost:8000/Lumenfall-juego/index.html")
    page.wait_for_load_state("networkidle")

    # Click start button
    page.click("#start-button")

    # Wait for menu transition and click Play
    page.wait_for_timeout(1000)
    page.click("#play-button")

    # Wait for game to load
    page.wait_for_timeout(2000)

    # Inject code to trigger lightning and inspect 3D proxy
    # We will trigger the lightning strike (Intensity 10) and take a screenshot
    # We also verify the Player material settings

    page.evaluate("""
        window.player.mesh.position.set(0, 2.1, 0);
        window.camera.position.set(0, 4, 8);
        window.camera.lookAt(0, 2, 0);

        // Trigger Lightning
        triggerLightningStrike();

        // Force the frame to render
        window.renderer.render(window.scene, window.camera);
    """)

    # Wait a tiny bit for the lightning effect (it fades in 100ms)
    page.wait_for_timeout(50)

    # Take screenshot of the lightning strike showing the 3D proxy reflection
    page.screenshot(path="verification/lightning_proxy.png")

    # Verify depthWrite settings
    depth_write_status = page.evaluate("""
        (() => {
            const pm = window.player.mesh.material.depthWrite;
            const gm = window.player.glowMesh.material.depthWrite;
            // Check proxy material
            const proxy = window.player.proxyGroup.children[0].material;
            const proxyColor = proxy.color.getHexString();
            const proxyDepth = proxy.depthWrite;
            const proxyBlend = (proxy.blending === THREE.AdditiveBlending);

            return {
                playerDepthWrite: pm,
                glowDepthWrite: gm,
                proxyColor: proxyColor,
                proxyDepthWrite: proxyDepth,
                proxyAdditive: proxyBlend
            };
        })()
    """)

    print(f"Verification Results: {depth_write_status}")

    if depth_write_status['playerDepthWrite'] is False and depth_write_status['glowDepthWrite'] is False:
        print("SUCCESS: Player depthWrite is False (Fix verified)")
    else:
        print("FAILURE: Player depthWrite is True")

    if depth_write_status['proxyAdditive'] is True:
        print("SUCCESS: Proxy uses Additive Blending")
    else:
        print("FAILURE: Proxy blending incorrect")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Avoid autoplay error
        context = browser.new_context(permissions=[])
        page = context.new_page()
        try:
            verify_fixes(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
