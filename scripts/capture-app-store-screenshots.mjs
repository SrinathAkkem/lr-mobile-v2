#!/usr/bin/env node
/**
 * Captures App Store screenshots (1284x2778) via Expo web + Playwright.
 * Usage: node scripts/capture-app-store-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(process.env.HOME, "Downloads", "rono-app-store-screenshots");
const BASE_URL = process.argv[2] || "http://localhost:8081";
const WIDTH = 1284;
const HEIGHT = 2778;

const fixtures = JSON.parse(
  await readFile(path.join(__dirname, "screenshot-fixtures.json"), "utf8"),
);

const MOCK_USER = {
  id: "dev-user-1",
  name: "Rajesh Kumar",
  mobile: "9012343216",
  role: "company_admin",
  companyId: "dev-company-1",
  branchId: "dev-branch-1",
  company: { id: "dev-company-1", name: "Rono Transport", lrCode: "RH", status: "active" },
  branch: { id: "dev-branch-1", name: "Hyderabad HQ", city: "Hyderabad" },
};

function jsonResponse(body) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function setupApiMocks(page) {
  return page.route("**/api/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/api/company/dashboard")) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            company: fixtures.company,
            stats: fixtures.stats,
            recentLrs: fixtures.lrs,
            topRoutes: [
              { route: "Hyderabad → Bengaluru", count: 42, freight: 185400 },
              { route: "Hyderabad → Vijayawada", count: 28, freight: 98400 },
            ],
            quota: {
              branches: { used: 1, max: 5 },
              executives: { used: 3, max: 20 },
              lrs: { used: 128, max: 500 },
            },
          },
        }),
      );
    }

    if (url.includes("/api/lr") && !url.match(/\/api\/lr\/[^/?]+/)) {
      return route.fulfill(jsonResponse({ success: true, data: fixtures.lrs }));
    }

    if (url.includes("/api/executives")) {
      return route.fulfill(jsonResponse({ success: true, data: fixtures.executives }));
    }

    if (url.includes("/api/auth/profile") || url.includes("/api/profile")) {
      return route.fulfill(jsonResponse({ success: true, data: MOCK_USER }));
    }

    return route.fulfill(jsonResponse({ success: true, data: {} }));
  });
}

async function seedAuth(page, { loggedIn }) {
  await page.addInitScript(
    ({ loggedIn, user }) => {
      localStorage.setItem("@rono:onboarding_completed", "true");
      if (loggedIn) {
        localStorage.setItem("rono_auth_token", "screenshot-dev-token");
        localStorage.setItem("rono_user", JSON.stringify(user));
        localStorage.setItem("@rono:last_first_name", "Rajesh");
      } else {
        localStorage.removeItem("rono_auth_token");
        localStorage.removeItem("rono_user");
        localStorage.setItem("@rono:last_first_name", "Rajesh");
      }
    },
    { loggedIn, user: MOCK_USER },
  );
}

async function capture(page, name, url, waitMs = 2500) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(waitMs);
  const outPath = path.join(OUT_DIR, name);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved ${outPath}`);
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 428, height: 926 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

// Login screen
{
  const page = await context.newPage();
  await setupApiMocks(page);
  await seedAuth(page, { loggedIn: false });
  await capture(page, "01-login.png", `${BASE_URL}/login`, 3000);
  await page.close();
}

// Authenticated screens
const screens = [
  ["02-dashboard.png", `${BASE_URL}/`],
  ["03-lr-list.png", `${BASE_URL}/lrs`],
  ["04-reports.png", `${BASE_URL}/reports`],
  ["05-executives.png", `${BASE_URL}/executives`],
  ["06-register.png", `${BASE_URL}/register`],
];

for (const [name, url] of screens) {
  const page = await context.newPage();
  await setupApiMocks(page);
  const loggedIn = !name.includes("register");
  await seedAuth(page, { loggedIn });
  await capture(page, name, url, loggedIn ? 3500 : 3000);
  await page.close();
}

await browser.close();

// Verify dimensions with sips via child_process
import { execSync } from "node:child_process";
console.log("\nScreenshot dimensions:");
for (const [name] of screens.concat([["01-login.png"]])) {
  const file = path.join(OUT_DIR, name);
  try {
    const out = execSync(`sips -g pixelWidth -g pixelHeight "${file}" 2>/dev/null`, {
      encoding: "utf8",
    });
    console.log(`${name}: ${out.trim().split("\n").slice(-2).join(", ")}`);
  } catch {
    console.log(`${name}: (check failed)`);
  }
}

console.log(`\nDone. Upload PNGs from:\n${OUT_DIR}`);
