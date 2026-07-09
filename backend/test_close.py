import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps/search/cosmetic+clinic+london")
        await page.wait_for_selector('a.hfpxzc')
        await page.locator('a.hfpxzc').first.click()
        await page.wait_for_selector('h1.DUwDvf')
        
        # Check all buttons
        buttons = await page.locator('button').all()
        for b in buttons:
            label = await b.get_attribute('aria-label')
            if label and ('back' in label.lower() or 'close' in label.lower()):
                print("Found Button aria-label:", label)
                
        await browser.close()

asyncio.run(run())
