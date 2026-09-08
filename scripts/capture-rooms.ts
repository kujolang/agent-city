import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
const page=await browser.newPage({viewport:{width:1360,height:1100}});await page.goto('http://127.0.0.1:5178');await page.waitForSelector('#roster button');
await page.getByRole('button',{name:/WORKCELL.*workcell-host/}).click();await page.locator('[data-scene=workshop]').click();await page.screenshot({path:resolve('evidence/phase1/08-workcell.png'),fullPage:true});
for(const scene of ['library','mcp','meeting','dispatch','dojo']){
 await page.locator(`[data-scene=${scene}]`).click();await page.screenshot({path:resolve(`evidence/phase1/room-${scene}.png`),fullPage:true});
}
await page.locator('[data-scene=city]').click();await page.screenshot({path:resolve('evidence/phase1/10-city-cohort.png'),fullPage:true});
await browser.close();
