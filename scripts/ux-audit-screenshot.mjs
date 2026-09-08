import { chromium, webkit } from "playwright";
import fs from "fs";

const viewports = [
  { name: "mob-320", width: 320, height: 568 },
  { name: "mob-360", width: 360, height: 640 },
  { name: "mob-375", width: 375, height: 667 },
  { name: "mob-390", width: 390, height: 844 },
  { name: "mob-412", width: 412, height: 915 },
  { name: "tab-768", width: 768, height: 1024 },
  { name: "desk-1280", width: 1280, height: 800 },
  { name: "desk-1440", width: 1440, height: 900 },
];

const roles = [
  { email: "owner@paypoq.local", paths: ["/"] },
  { email: "manager@paypoq.local", paths: ["/", "/production", "/machines", "/employees"] },
  { email: "seller@paypoq.local", paths: ["/sales", "/sales/orders", "/sales/payments"] },
  { email: "warehouse@paypoq.local", paths: ["/warehouse", "/warehouse/materials", "/warehouse/movements", "/warehouse/zones"] },
  { email: "shift@paypoq.local", paths: ["/production"] },
  { email: "accountant@paypoq.local", paths: ["/finance", "/finance/expenses", "/finance/payroll"] },
  { email: "mechanic@paypoq.local", paths: ["/machines"] },
  { email: "admin@paypoq.local", paths: ["/admin"] },
];

async function run() {
  if (!fs.existsSync("artifacts/audit-screenshots")) {
    fs.mkdirSync("artifacts/audit-screenshots", { recursive: true });
  }
  const browser = await chromium.launch();
  for (const role of roles) {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Login
    await page.goto("http://localhost:3000/login");
    if (role.email === "admin@paypoq.local") {
      await page.goto("http://localhost:3000/admin/login");
    }
    await page.fill('input[type="email"]', role.email);
    await page.fill('input[type="password"]', "ChangeMe123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/"); // wait for dashboard

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const p of role.paths) {
        await page.goto(`http://localhost:3000${p}`);
        await page.waitForTimeout(500); // wait for render
        const safePath = p === "/" ? "home" : p.replace(/\//g, "-").replace(/^-/, "");
        await page.screenshot({ path: `artifacts/audit-screenshots/${role.email.split('@')[0]}_${vp.name}_${safePath}.png`, fullPage: true });
      }
    }
    await context.close();
  }
  await browser.close();
  console.log("Screenshots completed");
}
run().catch(console.error);
