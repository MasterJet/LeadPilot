import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps/search/cosmetic+clinic+london")
        await page.wait_for_selector('a.hfpxzc')
        print("Initial items:", await page.locator('a.hfpxzc').count())
        
        for _ in range(10):
            listings = await page.locator('a.hfpxzc').all()
            if listings:
                try:
                    await listings[-1].scroll_into_view_if_needed(timeout=2000)
                except Exception as e:
                    print("Scroll error:", e)
            await asyncio.sleep(2)
            print("Items after scroll:", await page.locator('a.hfpxzc').count())
            
        await browser.close()

asyncio.run(run())
