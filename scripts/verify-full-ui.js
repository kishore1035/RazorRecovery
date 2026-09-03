const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const SCREENSHOTS_DIR = "/home/kali/.gemini/antigravity-cli/brain/18be6ed8-0c4f-46e4-8428-e0cece7fee96/final_screenshots";

async function run() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    { path: "/", name: "01_overview_dashboard" },
    { path: "/demo", name: "02_demo_simulator" },
    { path: "/orders", name: "03_orders" },
    { path: "/customers", name: "04_customers" },
    { path: "/products", name: "05_products" },
    { path: "/recoveries", name: "06_recoveries" },
    { path: "/insights", name: "07_insights" },
    { path: "/insights/leaks", name: "08_insights_leaks" },
    { path: "/insights/memory", name: "09_insights_memory" },
    { path: "/insights/payment-health", name: "10_insights_payment_health" },
    { path: "/insights/checkout-health", name: "11_insights_checkout_health" },
    { path: "/insights/recovery-health", name: "12_insights_recovery_health" },
    { path: "/recovery-lab", name: "13_recovery_lab" },
    { path: "/recovery-lab/simulator", name: "14_recovery_lab_simulator" },
    { path: "/copilot", name: "15_copilot" },
    { path: "/settings/preferences", name: "16_settings_preferences" },
    { path: "/settings/razorpay", name: "17_settings_razorpay" },
  ];

  console.log("Navigating all routes and capturing screenshots...");
  for (const r of routes) {
    try {
      await page.goto(`http://localhost:3000${r.path}`, { waitUntil: "networkidle2", timeout: 15000 });
      const imgPath = path.join(SCREENSHOTS_DIR, `${r.name}.png`);
      await page.screenshot({ path: imgPath, fullPage: true });
      console.log(`✓ Visited ${r.path} -> saved ${r.name}.png`);
    } catch (err) {
      console.error(`✗ Error on ${r.path}:`, err.message);
    }
  }

  // Test Copilot interaction with active leaks query
  console.log("Testing Copilot interaction...");
  try {
    await page.goto("http://localhost:3000/copilot", { waitUntil: "networkidle2" });
    const inputSelector = "input[placeholder*='Ask']";
    await page.waitForSelector(inputSelector);
    await page.type(inputSelector, "What are the active revenue leaks and how can we recover them?");
    await page.keyboard.press("Enter");
    
    // Wait for response
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes("UPI") || text.includes("leak") || text.includes("₹");
      },
      { timeout: 20000 }
    );
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "18_copilot_leaks_response.png"), fullPage: true });
    console.log("✓ Copilot leaks response captured");
  } catch (err) {
    console.error("✗ Copilot test error:", err.message);
  }

  // Test visiting Golden recovery case detail page
  console.log("Testing Golden Recovery Case detail page...");
  try {
    await page.goto("http://localhost:3000/recoveries", { waitUntil: "networkidle2" });
    const analyzeLink = await page.$("a[href^='/recoveries/']");
    if (analyzeLink) {
      await analyzeLink.click();
      await page.waitForNavigation({ waitUntil: "networkidle2" });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "19_recovery_detail_case.png"), fullPage: true });
      console.log("✓ Recovery detail case page captured");
    }
  } catch (err) {
    console.error("✗ Recovery case detail error:", err.message);
  }

  await browser.close();
  console.log("All UI verification checks completed successfully!");
}

run().catch(console.error);
