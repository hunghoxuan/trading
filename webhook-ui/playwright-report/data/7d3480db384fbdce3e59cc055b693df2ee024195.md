# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remote-ui.spec.js >> dashboard page loads data
- Location: tests/e2e/remote-ui.spec.js:17:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Dashboard' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('heading', { name: 'Dashboard' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: 📈 Trading
      - generic [ref=e7]: v2026.04.15-03
    - navigation [ref=e8]:
      - link "Dashboard" [ref=e9] [cursor=pointer]:
        - /url: /ui/dashboard
      - link "Trades" [ref=e10] [cursor=pointer]:
        - /url: /ui/trades
      - link "Settings" [ref=e11] [cursor=pointer]:
        - /url: /ui/settings
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e15]:
        - combobox [ref=e16]:
          - option "All accounts" [selected]
          - option "default"
        - combobox [ref=e17]:
          - option "All symbols" [selected]
          - option "AUDCAD"
          - option "BTCUSD"
          - option "DE40"
          - option "EURGBP"
          - option "EURJPY"
          - option "EURSGD"
          - option "EURUSD"
          - option "GBPJPY"
          - option "GBPUSD"
          - option "NZDCAD"
          - option "TEST"
          - option "USDCAD"
          - option "XAGUSD"
        - combobox [ref=e18]:
          - option "All strategies" [selected]
          - option "Hung-SMC"
        - combobox [ref=e19]:
          - option "Today"
          - option "Week"
          - option "Month" [selected]
          - option "Year"
        - generic [ref=e20]:
          - button "Total PnL" [ref=e21] [cursor=pointer]
          - button "Avg PnL/Trade" [ref=e22] [cursor=pointer]
      - generic [ref=e23]:
        - article [ref=e24]:
          - generic [ref=e25]: Total Trades
          - generic [ref=e26]: "190"
        - article [ref=e27]:
          - generic [ref=e28]: Closed Trades
          - generic [ref=e29]: "190"
        - article [ref=e30]:
          - generic [ref=e31]: Wins / Losses
          - generic [ref=e32]: 37 / 29
        - article [ref=e33]:
          - generic [ref=e34]: Win Rate
          - generic [ref=e35]: 19.47%
        - article [ref=e36]:
          - generic [ref=e37]: Total PnL
          - generic [ref=e38]: "17.03"
      - generic [ref=e39]:
        - article [ref=e40]:
          - generic [ref=e41]: Total PnL Today
          - generic [ref=e42]: "19.37"
          - generic [ref=e43]: 79 trades
        - article [ref=e44]:
          - generic [ref=e45]: Total PnL Week
          - generic [ref=e46]: "17.03"
          - generic [ref=e47]: 190 trades
        - article [ref=e48]:
          - generic [ref=e49]: Total PnL Month
          - generic [ref=e50]: "17.03"
          - generic [ref=e51]: 190 trades
        - article [ref=e52]:
          - generic [ref=e53]: Total PnL Year
          - generic [ref=e54]: "17.03"
          - generic [ref=e55]: 190 trades
      - generic [ref=e56]:
        - generic [ref=e57]:
          - heading "PnL Trend" [level=2] [ref=e59]
          - generic "PnL trend bars" [ref=e60]:
            - 'generic "2026-04-13: 0.00" [ref=e61]'
            - 'generic "2026-04-14: 0.00" [ref=e62]'
            - 'generic "2026-04-15: 17.03" [ref=e63]'
        - generic [ref=e64]:
          - heading "Summary Tiers" [level=2] [ref=e66]
          - generic [ref=e67]:
            - article [ref=e68]:
              - generic [ref=e69]: OPEN
              - generic [ref=e70]: "47"
              - generic [ref=e71]: "12.34"
            - article [ref=e72]:
              - generic [ref=e73]: WINS_LOSSES
              - generic [ref=e74]: "66"
              - generic [ref=e75]: "4.69"
            - article [ref=e76]:
              - generic [ref=e77]: CLOSED
              - generic [ref=e78]: "77"
              - generic [ref=e79]: "0.00"
        - generic [ref=e80]:
          - heading "Status Breakdown" [level=2] [ref=e82]
          - generic [ref=e83]:
            - generic [ref=e84]:
              - generic [ref=e85]: OK
              - generic [ref=e88]: "47"
            - generic [ref=e89]:
              - generic [ref=e90]: FAIL
              - generic [ref=e93]: "42"
            - generic [ref=e94]:
              - generic [ref=e95]: TP
              - generic [ref=e98]: "37"
            - generic [ref=e99]:
              - generic [ref=e100]: EXPIRED
              - generic [ref=e103]: "35"
            - generic [ref=e104]:
              - generic [ref=e105]: SL
              - generic [ref=e108]: "29"
      - generic [ref=e109]:
        - generic [ref=e110]:
          - heading "Top Winrate by Symbol" [level=2] [ref=e112]
          - generic [ref=e113]:
            - generic [ref=e114]:
              - generic [ref=e115]: Name
              - generic [ref=e116]: W
              - generic [ref=e117]: L
              - generic [ref=e118]: Win%
              - generic [ref=e119]: R
            - generic [ref=e120]:
              - generic "EURJPY" [ref=e121]
              - generic [ref=e122]: "6"
              - generic [ref=e123]: "0"
              - generic [ref=e124]: 100.00%
              - generic [ref=e125]: "0.00"
            - generic [ref=e126]:
              - generic "NZDCAD" [ref=e127]
              - generic [ref=e128]: "3"
              - generic [ref=e129]: "0"
              - generic [ref=e130]: 100.00%
              - generic [ref=e131]: "0.00"
            - generic [ref=e132]:
              - generic "TEST" [ref=e133]
              - generic [ref=e134]: "1"
              - generic [ref=e135]: "0"
              - generic [ref=e136]: 100.00%
              - generic [ref=e137]: "0.49"
            - generic [ref=e138]:
              - generic "GBPJPY" [ref=e139]
              - generic [ref=e140]: "6"
              - generic [ref=e141]: "3"
              - generic [ref=e142]: 66.67%
              - generic [ref=e143]: "0.00"
            - generic [ref=e144]:
              - generic "EURSGD" [ref=e145]
              - generic [ref=e146]: "22"
              - generic [ref=e147]: "26"
              - generic [ref=e148]: 45.83%
              - generic [ref=e149]: "0.00"
            - generic [ref=e150]:
              - generic "EURUSD" [ref=e151]
              - generic [ref=e152]: "0"
              - generic [ref=e153]: "0"
              - generic [ref=e154]: 0.00%
              - generic [ref=e155]: "0.00"
            - generic [ref=e156]:
              - generic "USDCAD" [ref=e157]
              - generic [ref=e158]: "0"
              - generic [ref=e159]: "0"
              - generic [ref=e160]: 0.00%
              - generic [ref=e161]: "0.00"
            - generic [ref=e162]:
              - generic "EURGBP" [ref=e163]
              - generic [ref=e164]: "0"
              - generic [ref=e165]: "0"
              - generic [ref=e166]: 0.00%
              - generic [ref=e167]: "0.00"
            - generic [ref=e168]:
              - generic "DE40" [ref=e169]
              - generic [ref=e170]: "0"
              - generic [ref=e171]: "0"
              - generic [ref=e172]: 0.00%
              - generic [ref=e173]: "0.00"
            - generic [ref=e174]:
              - generic "AUDCAD" [ref=e175]
              - generic [ref=e176]: "0"
              - generic [ref=e177]: "0"
              - generic [ref=e178]: 0.00%
              - generic [ref=e179]: "0.00"
        - generic [ref=e180]:
          - heading "Top Winrate by Entry Model" [level=2] [ref=e182]
          - generic [ref=e183]:
            - generic [ref=e184]:
              - generic [ref=e185]: Name
              - generic [ref=e186]: W
              - generic [ref=e187]: L
              - generic [ref=e188]: Win%
              - generic [ref=e189]: R
            - generic [ref=e190]:
              - generic "RJ.1h.0.2" [ref=e191]
              - generic [ref=e192]: "9"
              - generic [ref=e193]: "1"
              - generic [ref=e194]: 90.00%
              - generic [ref=e195]: "0.00"
            - generic [ref=e196]:
              - generic "RJ.1h.0.5" [ref=e197]
              - generic [ref=e198]: "9"
              - generic [ref=e199]: "1"
              - generic [ref=e200]: 90.00%
              - generic [ref=e201]: "0.00"
            - generic [ref=e202]:
              - generic "RJ.1h.1" [ref=e203]
              - generic [ref=e204]: "9"
              - generic [ref=e205]: "1"
              - generic [ref=e206]: 90.00%
              - generic [ref=e207]: "0.00"
            - generic [ref=e208]:
              - generic "RJ.15m.0.2" [ref=e209]
              - generic [ref=e210]: "4"
              - generic [ref=e211]: "8"
              - generic [ref=e212]: 33.33%
              - generic [ref=e213]: "0.00"
            - generic [ref=e214]:
              - generic "RJ.15m.0.5" [ref=e215]
              - generic [ref=e216]: "3"
              - generic [ref=e217]: "9"
              - generic [ref=e218]: 25.00%
              - generic [ref=e219]: "0.00"
            - generic [ref=e220]:
              - generic "RJ.15m.1" [ref=e221]
              - generic [ref=e222]: "3"
              - generic [ref=e223]: "9"
              - generic [ref=e224]: 25.00%
              - generic [ref=e225]: "0.00"
            - generic [ref=e226]:
              - generic "RJ.4h.0.2" [ref=e227]
              - generic [ref=e228]: "0"
              - generic [ref=e229]: "0"
              - generic [ref=e230]: 0.00%
              - generic [ref=e231]: "0.00"
            - generic [ref=e232]:
              - generic "RJ.4h.0.5" [ref=e233]
              - generic [ref=e234]: "0"
              - generic [ref=e235]: "0"
              - generic [ref=e236]: 0.00%
              - generic [ref=e237]: "0.00"
            - generic [ref=e238]:
              - generic "RJ.4h.1" [ref=e239]
              - generic [ref=e240]: "0"
              - generic [ref=e241]: "0"
              - generic [ref=e242]: 0.00%
              - generic [ref=e243]: "0.00"
            - generic [ref=e244]:
              - generic "Hung-SMC" [ref=e245]
              - generic [ref=e246]: "0"
              - generic [ref=e247]: "0"
              - generic [ref=e248]: 0.00%
              - generic [ref=e249]: "0.00"
        - generic [ref=e250]:
          - heading "Top Winrate by Account" [level=2] [ref=e252]
          - generic [ref=e253]:
            - generic [ref=e254]:
              - generic [ref=e255]: Name
              - generic [ref=e256]: W
              - generic [ref=e257]: L
              - generic [ref=e258]: Win%
              - generic [ref=e259]: R
            - generic [ref=e260]:
              - generic "default" [ref=e261]
              - generic [ref=e262]: "38"
              - generic [ref=e263]: "29"
              - generic [ref=e264]: 56.72%
              - generic [ref=e265]: "0.49"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const API_KEY = process.env.API_KEY || "";
  4  | const API_BASE = process.env.BASE_URL || "http://139.59.211.192";
  5  | 
  6  | test.beforeEach(async ({ page }) => {
  7  |   await page.addInitScript(([apiKey, apiBase]) => {
  8  |     if (apiKey) {
  9  |       localStorage.setItem("tvbridge_api_key", apiKey);
  10 |     }
  11 |     if (apiBase) {
  12 |       localStorage.setItem("tvbridge_api_base", apiBase);
  13 |     }
  14 |   }, [API_KEY, API_BASE]);
  15 | });
  16 | 
  17 | test("dashboard page loads data", async ({ page }) => {
  18 |   await page.goto("dashboard");
> 19 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  20 |   await expect(page.getByText("Loading dashboard...")).toHaveCount(0);
  21 |   await expect(page.locator(".error")).toHaveCount(0);
  22 |   await expect(page.getByText("Total Trades")).toBeVisible();
  23 | });
  24 | 
  25 | test("trades page loads list panel", async ({ page }) => {
  26 |   await page.goto("trades");
  27 |   await expect(page.getByRole("heading", { name: "Trades" })).toBeVisible({ timeout: 20_000 });
  28 |   await expect(page.getByText("Loading trades...")).toHaveCount(0);
  29 |   await expect(page.locator(".error")).toHaveCount(0);
  30 |   await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  31 | });
  32 | 
```