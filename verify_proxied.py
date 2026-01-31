import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})

        # Homepage (proxied)
        await page.goto('http://localhost:3000')
        await page.wait_for_timeout(3000)
        await page.screenshot(path='verification/final_homepage_proxied.png')
        print("Captured proxied homepage screenshot.")

        # Detail page
        await page.click('text=Copy Trade')
        await page.wait_for_timeout(3000)
        await page.screenshot(path='verification/final_detailpage_proxied.png')
        print("Captured proxied detail page screenshot.")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
