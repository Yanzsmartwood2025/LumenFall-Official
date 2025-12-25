from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    cwd = os.getcwd()
    file_url = f"file://{cwd}/Lumenfall-juego/index.html"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--disable-web-security", "--allow-file-access-from-files"]
        )
        page = browser.new_page()
        page.route("**/auth-core.js", lambda r: r.fulfill(body="window.LumenfallAuth={currentUser:{uid:'t'},onAuthStateChanged:cb=>cb({uid:'t'})}"))

        # Mock Audio
        page.add_init_script("""
            window.fetch = async (url) => { if(url.toString().endsWith('.mp3')) return {ok:true, arrayBuffer:async()=>new ArrayBuffer(0)}; return window.fetch(url); };
            window.AudioContext = class { decodeAudioData(b) { return Promise.resolve(this.createBuffer(1,1,44100)); } createBuffer(){return{}} createGain(){return{gain:{value:1,linearRampToValueAtTime:()=>{},setTargetAtTime:()=>{}}}} createBufferSource(){return{buffer:null,playbackRate:{value:1},connect:()=>({connect:()=>{}}),start:()=>{},stop:()=>{}}} };
            window.webkitAudioContext = window.AudioContext;
        """)

        try:
            page.goto(file_url)
            # Click Start first
            page.wait_for_selector('#start-button', state='visible').click()
            time.sleep(1)

            page.wait_for_selector('#play-button', state='visible').click()
            page.wait_for_function("() => window.player && window.player.mesh", timeout=10000)

            result = page.evaluate("""
                () => {
                    window.player.shoot({x: 1, y: 0});
                    window.player.shootCooldown = 0;
                    window.player.shoot({x: 1, y: 0});

                    const p1 = window.allProjectiles[0];
                    const p2 = window.allProjectiles[1];

                    if (!p1 || !p2) return "Not enough projectiles";

                    return {
                        uniqueMainTextures: p1.mesh.material.map.uuid !== p2.mesh.material.map.uuid
                    };
                }
            """)
            print("Texture Uniqueness:", result)

        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
