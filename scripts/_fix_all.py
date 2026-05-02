#!/usr/bin/env python3
"""Fix: Enter key in textarea, + / - buttons on symbol chips, browser grid by tab."""

import sys

changes = 0

# ====== FIX 1: SettingsPage textarea Enter key ======
with open("web-ui/src/pages/settings/SettingsPage.jsx") as f:
    c = f.read()

old_textarea = """                    <textarea
                      rows={15}
                      value={symbolsDetailText}
                      onChange={(e) => {
                        const text = e.target.value;
                        setSymbolsDetailText(text);
                        const arr = text
                          .split(/[\\n,]/)
                          .map((x) =>
                            String(x || "")
                              .trim()
                              .toUpperCase(),
                          )
                          .filter(Boolean);
                        setSettings((prev) =>
                          prev.map((x) =>
                            getSettingKey(x) === getSettingKey(selectedSetting)
                              ? {
                                  ...x,
                                  data: {
                                    ...(x.data || {}),
                                    symbols: [...new Set(arr)],
                                  },
                                }
                              : x,
                          ),
                        );
                      }}"""

new_textarea = """                    <textarea
                      rows={15}
                      value={symbolsDetailText}
                      onChange={(e) => {
                        setSymbolsDetailText(e.target.value);
                      }}
                      onBlur={(e) => {
                        const text = e.target.value;
                        const arr = text
                          .split(/[\\n,]/)
                          .map((x) =>
                            String(x || "")
                              .trim()
                              .toUpperCase(),
                          )
                          .filter(Boolean);
                        setSettings((prev) =>
                          prev.map((x) =>
                            getSettingKey(x) === getSettingKey(selectedSetting)
                              ? {
                                  ...x,
                                  data: {
                                    ...(x.data || {}),
                                    symbols: [...new Set(arr)],
                                  },
                                }
                              : x,
                          ),
                        );
                      }}"""

if old_textarea in c:
    c = c.replace(old_textarea, new_textarea)
    changes += 1
    print("FIX 1: SettingsPage textarea - onChange only, settings on blur")
else:
    print("FIX 1: FAILED - textarea pattern not found")
    idx = c.find("rows={15}")
    if idx > 0:
        print(f"  Found at {idx}: {repr(c[idx : idx + 120])}")

with open("web-ui/src/pages/settings/SettingsPage.jsx", "w") as f:
    f.write(c)

# ====== FIXES 2+3: ChartSnapshotsPage - browser grid + add/remove buttons ======
with open("web-ui/src/pages/ai/ChartSnapshotsPage.jsx") as f:
    c2 = f.read()

# 2a: Browser grid uses symbolsByTab instead of watchlist
old_grid = """            <div className="browser-grid-v1">
              {watchlist
                .slice(
                  (browserPage - 1) * browserPageSize,
                  browserPage * browserPageSize,
                )"""
new_grid = """            <div className="browser-grid-v1">
              {symbolsByTab
                .slice(
                  (browserPage - 1) * browserPageSize,
                  browserPage * browserPageSize,
                )"""
if old_grid in c2:
    c2 = c2.replace(old_grid, new_grid)
    changes += 1
    print("FIX 2a: Browser grid uses symbolsByTab")
else:
    print("FIX 2a: FAILED - browser grid pattern not found")

# 2b: Page count uses symbolsByTab.length
old_page = "Math.ceil(watchlist.length / browserPageSize)"
new_page = "Math.ceil(symbolsByTab.length / browserPageSize)"
count = c2.count(old_page)
if count > 0:
    # Replace all (there may be 2 occurrences)
    c2 = c2.replace("watchlist.length", "symbolsByTab.length")
    changes += 1
    print(f"FIX 2b: Page count uses symbolsByTab.length ({count} occurrences)")
else:
    print("FIX 2b: FAILED - page count pattern not found")

# 2c: Add + / - buttons on symbol chips
old_chip = """                      {filtered.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`secondary-button snapshot-tag-v2 ${normalizeWatchSymbol(cfg.symbol) === s ? "active" : ""}`}
                          onClick={() => setCfgField("symbol", s)}
                        >
                          {s}
                        </button>
                      ))}"""
new_chip = """                      {filtered.map((s) => (
                        <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                          <button
                            type="button"
                            className={`secondary-button snapshot-tag-v2 ${normalizeWatchSymbol(cfg.symbol) === s ? "active" : ""}`}
                            onClick={() => setCfgField("symbol", s)}
                          >
                            {s}
                          </button>
                          {symbolFilterTab === "FAVOURITE" ? (
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ width: 18, height: 18, padding: 0, fontSize: 10, lineHeight: 1, minWidth: 18, borderRadius: 4 }}
                              onClick={(e) => { e.stopPropagation(); removeFromWatchlist(s); }}
                              title={"Remove " + s + " from watchlist"}
                            >
                              -
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ width: 18, height: 18, padding: 0, fontSize: 10, lineHeight: 1, minWidth: 18, borderRadius: 4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = [...new Set([...watchlist, s])];
                                saveWatchlistToDb(next).then(() => setWatchlist(next));
                              }}
                              title={"Add " + s + " to watchlist"}
                            >
                              +
                            </button>
                          )}
                        </span>
                      ))}"""
if old_chip in c2:
    c2 = c2.replace(old_chip, new_chip)
    changes += 1
    print("FIX 2c: + / - buttons on symbol chips")
else:
    print("FIX 2c: FAILED - symbol chip pattern not found")
    idx = c2.find("filtered.map((s) => (")
    if idx > 0:
        print(f"  Found at {idx}: {repr(c2[idx : idx + 200])}")

with open("web-ui/src/pages/ai/ChartSnapshotsPage.jsx", "w") as f:
    f.write(c2)

print(f"\nTotal changes: {changes}")
