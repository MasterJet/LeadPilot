import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps/search/cosmetic+clinic+london")
        await page.wait_for_selector('a.hfpxzc')
        print("Found items:", await page.locator('a.hfpxzc').count())
        await page.locator('a.hfpxzc').first.click()
        await page.wait_for_selector('h1.DUwDvf')
        print("Clicked first item. URL is now:", page.url)
        
        # Try to find a back button and click it
        back_btn = page.locator('button[jsaction*="back"], button[aria-label*="Back"], button[aria-label*="Close"]').first
        if await back_btn.count() > 0:
            print("Clicking back/close button")
            await back_btn.click()
            await asyncio.sleep(2)
            print("URL after back:", page.url)
            print("Items after back:", await page.locator('a.hfpxzc').count())
                
        await browser.close()

asyncio.run(run())
