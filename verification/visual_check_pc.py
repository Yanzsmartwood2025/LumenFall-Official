from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import UnexpectedAlertPresentException, NoAlertPresentException, TimeoutException
import time
import os

def check_pc_layout():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(options=chrome_options)

    try:
        file_path = os.path.abspath("Armeria/index.html")
        driver.get(f"file://{file_path}")
        time.sleep(2) # Allow initial render

        print("Taking screenshot of Carousel...")
        driver.save_screenshot("verification/screenshot_carousel_pc.png")

        print("Opening Product Modal...")
        # Find first product card
        card = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".product-card"))
        )
        # Scroll to it
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", card)
        time.sleep(1)
        card.click()

        # Wait for Modal
        modal = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "product-modal"))
        )
        time.sleep(2) # Wait for CSS transition (0.4s) + safety
        driver.save_screenshot("verification/screenshot_modal_pc.png")

        print("Selecting Options...")

        # 1. Select Gender (Man)
        try:
            # Look for button inside the gender container
            gender_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#gender-btn-container button:first-child"))
            )
            driver.execute_script("arguments[0].click();", gender_btn)
            print("Selected Gender: HOMBRE")
            time.sleep(0.5)
        except TimeoutException:
            print("Failed to find Gender button!")

        # 2. Select Size (M)
        try:
            # Need to wait for size options to be populated (JS)
            size_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//div[@id='size-options']//button[normalize-space()='M']"))
            )
            driver.execute_script("arguments[0].click();", size_btn)
            print("Selected Size: M")
            time.sleep(0.5)
        except TimeoutException:
            print("Failed to find Size M button!")

        # 3. Select Color (Black)
        try:
            color_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#color-options .color-btn.black"))
            )
            driver.execute_script("arguments[0].click();", color_btn)
            print("Selected Color: BLACK")
            time.sleep(0.5)
        except TimeoutException:
            print("Failed to find Color Black button!")

        print("Adding to Cart...")
        add_btn = driver.find_element(By.ID, "add-to-cart-btn")
        driver.execute_script("arguments[0].click();", add_btn)
        time.sleep(1)

        # Check for Alert (Failure)
        try:
            WebDriverWait(driver, 2).until(EC.alert_is_present())
            alert = driver.switch_to.alert
            print(f"ALERT DETECTED (Failure): {alert.text}")
            alert.accept()
        except TimeoutException:
            print("Success: No alert detected (Item added).")

        print("Opening Cart...")
        cart_btn = driver.find_element(By.ID, "cart-btn")
        driver.execute_script("arguments[0].click();", cart_btn)

        WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.ID, "cart-modal"))
        )
        time.sleep(2)
        driver.save_screenshot("verification/screenshot_cart_pc.png")
        print("Cart screenshot saved.")

    except Exception as e:
        print(f"Global Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    check_pc_layout()
