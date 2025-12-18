from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

def check_mobile_layout():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Mobile Emulation
    mobile_emulation = {
        "deviceMetrics": { "width": 375, "height": 812, "pixelRatio": 3.0 },
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1"
    }
    chrome_options.add_experimental_option("mobileEmulation", mobile_emulation)

    driver = webdriver.Chrome(options=chrome_options)

    try:
        file_path = os.path.abspath("Armeria/index.html")
        driver.get(f"file://{file_path}")
        time.sleep(2)

        print("Taking screenshot of Mobile Home...")
        driver.save_screenshot("verification/screenshot_mobile_home.png")

        print("Opening Product Modal (Mobile)...")
        card = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".product-card"))
        )
        # Scroll
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", card)
        time.sleep(1)
        card.click()

        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "product-modal"))
        )
        time.sleep(2)
        driver.save_screenshot("verification/screenshot_mobile_modal.png")

        print("Adding to Cart (Mobile)...")
        # Select Options (Same logic as PC, required for cart)
        try:
            gender_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#gender-btn-container button:first-child"))
            )
            driver.execute_script("arguments[0].click();", gender_btn)

            size_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//div[@id='size-options']//button[normalize-space()='M']"))
            )
            driver.execute_script("arguments[0].click();", size_btn)

            color_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#color-options .color-btn.black"))
            )
            driver.execute_script("arguments[0].click();", color_btn)
        except Exception as e:
            print(f"Selection error: {e}")

        add_btn = driver.find_element(By.ID, "add-to-cart-btn")
        driver.execute_script("arguments[0].click();", add_btn)
        time.sleep(1)

        # Handle Alert if any
        try:
            WebDriverWait(driver, 2).until(EC.alert_is_present())
            driver.switch_to.alert.accept()
        except:
            pass

        print("Opening Cart (Mobile)...")
        cart_btn = driver.find_element(By.ID, "cart-btn")
        driver.execute_script("arguments[0].click();", cart_btn)

        WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.ID, "cart-modal"))
        )
        time.sleep(2)
        driver.save_screenshot("verification/screenshot_mobile_cart.png")
        print("Mobile verification complete.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    check_mobile_layout()
