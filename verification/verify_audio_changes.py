from playwright.sync_api import sync_playwright

def verify_audio_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant permissions to avoid audio issues (though in headless it might not matter much for code inspection)
        context = browser.new_context()
        page = context.new_page()

        # Go to the game
        print("Navigating to game...")
        page.goto("http://localhost:8000/Lumenfall-juego/index.html")

        # Wait for game.js to load (SimpleEnemy should be defined)
        print("Waiting for SimpleEnemy...")
        page.wait_for_function("typeof SimpleEnemy !== 'undefined'")

        # Get the source code of the update method
        print("Evaluating code...")
        update_code = page.evaluate("SimpleEnemy.prototype.update.toString()")

        success_growl = False
        success_impact = False

        # Check for growl volume change
        # Expected: this.growlGain.gain.setTargetAtTime(vol * 1.0, audioContext.currentTime, 0.1);
        # We look for "vol * 1.0" or "vol * 1"
        if "vol * 1.0" in update_code:
            print("SUCCESS: Growl volume multiplier is 1.0")
            success_growl = True
        else:
            print("FAILURE: Growl volume multiplier NOT found. Code snippet:")
            # Print relevant part
            import re
            match = re.search(r"this\.growlGain\.gain\.setTargetAtTime\((.*?)\)", update_code)
            if match:
                print(f"Found: {match.group(0)}")
            else:
                print("Could not find setTargetAtTime call.")

        # Check for impact volume change
        # Expected: this.playScopedSound('enemy1_impact', 1.0, 1.0, distanceToPlayer);
        if "this.playScopedSound('enemy1_impact', 1.0, 1.0, distanceToPlayer)" in update_code:
             print("SUCCESS: Impact volume is 1.0")
             success_impact = True
        else:
             print("FAILURE: Impact volume 1.0 NOT found. Code snippet:")
             match = re.search(r"this\.playScopedSound\('enemy1_impact', (.*?)\)", update_code)
             if match:
                 print(f"Found: {match.group(0)}")
             else:
                 print("Could not find playScopedSound call for impact.")

        # Take a screenshot just to satisfy the tool requirement, although visual check is not the primary goal here.
        page.screenshot(path="verification/audio_verification.png")

        browser.close()

        if success_growl and success_impact:
            print("VERIFICATION PASSED")
        else:
            print("VERIFICATION FAILED")

if __name__ == "__main__":
    verify_audio_changes()
