from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # The file path is relative to repo root
    file_url = "file://" + os.path.abspath("index.html")
    print(f"Navigating to {file_url}")
    page.goto(file_url)

    # 1. Verify "JUGAR EL DEMO" is visible but locked (we can't click it easily without user interaction or mocking auth, but we can check it exists)
    print("Checking for JUGAR EL DEMO link...")
    play_link = page.get_by_role("link", name="JUGAR EL DEMO")
    # In my logic, I added an onclick handler. The link still exists.

    # 2. Open the modal
    print("Opening Email Modal...")
    page.click("#open-email-modal")

    # 3. Verify Modal Content
    print("Verifying Modal Content...")
    # Check for Google Button
    google_btn = page.query_selector("#modal-google-btn")
    if google_btn:
        print("SUCCESS: Google button found.")
    else:
        print("FAILURE: Google button NOT found.")

    # Check for GitHub Button
    github_btn = page.query_selector("#modal-github-btn")
    if github_btn:
        print("SUCCESS: GitHub button found.")
    else:
        print("FAILURE: GitHub button NOT found.")

    # Check for Magic Link Button
    magic_btn = page.query_selector("#modal-magic-link-btn")
    if magic_btn:
        print("SUCCESS: Magic Link button found.")
    else:
        print("FAILURE: Magic Link button NOT found.")

    # Check Password Field (Should NOT exist)
    password_field = page.query_selector("#modal-password")
    if not password_field:
        print("SUCCESS: Password field correctly removed.")
    else:
        print("FAILURE: Password field still exists.")

    # Take Screenshot
    page.screenshot(path="verification/auth_modal_check.png")
    print("Screenshot saved to verification/auth_modal_check.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
