import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps/search/cosmetic+clinic+london")
        await page.wait_for_selector('a.hfpxzc')
        print("Initial items:", await page.locator('a.hfpxzc').count())
        
        feed = await page.query_selector('div[role="feed"]')
        if feed:
            for _ in range(5):
                await feed.evaluate("el => el.scrollTop = el.scrollHeight")
                await asyncio.sleep(2)
                print("Items after scroll:", await page.locator('a.hfpxzc').count())
        
        await browser.close()

asyncio.run(run())
