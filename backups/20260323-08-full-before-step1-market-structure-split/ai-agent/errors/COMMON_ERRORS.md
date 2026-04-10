# Common Pine Script Errors (Project Notes)

## Pine compile: `Cannot call 'LIB.<fn>' with 'na' as a value for a non-typified argument`

### Symptom
TradingView reports errors like:
- `Cannot call 'LIB.update_projected_box_slot' with 'na' as a value for a non-typified argument`
- `The argument 'leftTime' should be explicitly typified`

### Root cause (this project instance)
When calling a typed library method (`int`, `float`, etc.), passing raw `na` is ambiguous in Pine for non-series/non-inferred parameters.

### Fix applied
Use explicit typed `na` casts at callsites:

```pine
LIB.update_projected_box_slot(..., int(na), 0, float(na), float(na), ...)
```

### Prevention checklist
- For typed function params, never pass raw `na`; cast explicitly (`int(na)`, `float(na)`, `string(na)` when needed).
- Re-check all branches (`else`/fallback branches are common places where raw `na` is used).
- After moving local helpers to `LIB`, recompile and scan for typed-`na` argument errors.

## Pine runtime: `requested historical offset ... is beyond historical buffer` from EQ scan

### Symptom
TradingView reports stack like:
- `at LIB.is_valid_eq_candle()`
- `at find_equal_low()/find_equal_high()`
- `at execute_eq_logic()`

### Root cause (this project instance)
EQ candidate loops used dynamic offsets (`prevOff`, `checkOff`) from old cached pivots. Some offsets exceeded accessible history buffer on current run.

### Fix applied
- Added EQ offset cap constant in ICT file: `EQ_SAFE_HISTORY_OFFSET`.
- Guarded all EQ dynamic offsets before any series access or `LIB.is_valid_eq_candle(...)` call.
- Pruned old EQ pivot caches each bar so stale indices older than safe offset are removed.

### Prevention checklist
- For any dynamic `[offset]` access, guard `offset` bounds before series reads.
- Cache structures that store `bar_index` should be pruned by both size and max age.
- Keep EQ/loop lookback consistent with `max_bars_back` and runtime-safe offset caps.

## Pine runtime: `array.get() Index -1 is out of bounds` in `while size>0 and array.get(...)`

### Symptom
Bar-0 (or early-bar) crash in loops that look safe:
- `while array.size(arr) > 0 and array.get(arr, array.size(arr)-1) ...`

### Root cause (this project instance)
Pine may still evaluate `array.get(...)` in compound loop conditions, causing `size-1 = -1` on empty arrays.

### Fix applied
Rewrote pruning loops to:
1. Check size in `while`.
2. Compute `lastPos` and `array.get(...)` inside loop body.
3. `break` when no prune needed.

### Prevention checklist
- Do not combine `array.size(...) > 0` and `array.get(...)` in one `while/if` condition.
- Always split size check and `array.get` into separate statements.

## Pine parser: `Mismatched input 'else' expecting 'end of line without line continuation'`

### Symptom
TradingView shows an error on an `else if` line, but the actual problem is usually the `if` line above it.

### Root cause (this project instance)
A previous cleanup removed the only statement inside an `if` branch in `update_zigzag_pivots(...)`:

- `if t.ArrayType.size() == 0`
- body was removed (`t.PASS := 1`), leaving the branch empty
- next line `else if ...` then becomes invalid in Pine parser

### Fix applied
Add an explicit no-op body so the `if` branch is not empty:

```pine
if t.ArrayType.size() == 0
    bool(na)
else if t.ArrayType.size() >= 1
    ...
```

### Prevention checklist (use before/after refactors)
- Never leave an `if`, `else if`, or `else` branch empty in Pine.
- After removing a field/assignment, check whether it was the only statement in a branch.
- If a branch is intentionally empty, use an explicit no-op (`bool(na)`) and comment if needed.
- When Pine reports an `else` parser error, inspect the preceding branch for a missing body.

### Files affected
- `/Users/macmini/Trade/Bot/Hung Bot/_2_ICT-SMC-PA All-in-one2.pine`

---

## Pine compile: `Undeclared identifier` after refactor (block scope variable)

### Symptom
TradingView reports:
- `Undeclared identifier 'prevPivotAdvCode'`

### Root cause (this project instance)
A local variable was declared inside one `if` block and then reused in a separate sibling `if` block:

- declared inside first `if t.ArrayTypeAdv.size() > 1`
- referenced later inside a second `if t.ArrayTypeAdv.size() > 1`

In Pine, local variables are block-scoped.

### Fix applied
Redeclare (or move declaration) inside the second block before usage:

```pine
if t.ArrayTypeAdv.size() > 1
    int prevPivotAdvCode = pivot_type_code(t.ArrayTypeAdv.get(t.ArrayTypeAdv.size() - 2))
    ...
```

---

## Pine compile: `Undeclared identifier '<x>'` (used before declared in same block)

### Symptom
TradingView reports:
- `Undeclared identifier 'duration'`

### Root cause (this project instance)
During a refactor, a variable was referenced earlier in a block before its declaration line. Pine requires a variable to be declared before any use in that scope, even if it is eventually declared later in the same `if` block.

### Fix applied
Move the declaration above the first use, and remove any later duplicate declaration to avoid shadowing/confusion.

Example:

```pine
if wyState == WY_STATE_RANGE
    int duration = bar_index - wyStartIdx
    int bars = math.min(duration, wyLookbackLen)

## Pine runtime: `requested historical offset ... is beyond historical buffer` from `draw_hline` (PD/PW)

### Symptom
TradingView reports:
- `Error on bar ...: The requested historical offset (...) is beyond the historical buffer's limit (...)`
- stack includes:
  - `at CORE.draw_hline()`
  - `at draw_data_pd_pw()`

### Root cause (this project instance)
`draw_data_pd_pw(...)` converts `D/W` timestamps to `bar_index` via `closest_bar_index_from_time(...)`.  
On some symbols/history windows, returned `pdLeft/pwLeft` can be too far left for current chart buffer, causing `line.new/set_x1` to request an out-of-range historical offset.

### Fix applied
Clamp PD/PW left anchor to a safe recent bar-index window before calling `CORE.draw_hline(...)`:

```pine
int SAFE_PDPW_BACK_BARS = 450
int minSafeLeft = math.max(bar_index - SAFE_PDPW_BACK_BARS, 0)
int pdLeft = na(pdLeftRaw) ? bar_index : math.max(pdLeftRaw, minSafeLeft)
int pwLeft = na(pwLeftRaw) ? bar_index : math.max(pwLeftRaw, minSafeLeft)
```

### Prevention checklist
- For any line drawn with `xloc.bar_index`, clamp `x1/x2` into a safe back-range.
- Do not assume timestamp->barIndex mapping is always within current runtime buffer.
- Reuse per-feature safe-back constants for deterministic behavior (`SAFE_*_BACK_BARS`).

## Pine runtime: `array.get() Index 0 is out of bounds, array size is 0` in dashboard renderer

### Symptom
TradingView reports stack like:
- `at CORE.render_strategy_stats_table()`
- `at CORE.render_entries_dashboard_from_entries()`

### Root cause (this project instance)
`render_strategy_stats_table(...)` iterated `for b = 0 to rowCount - 1` even when `rowCount = 0`.  
In Pine, this can still evaluate loop body boundary expressions and lead to `array.get(..., 0)` on empty arrays.

### Fix applied
Guard the loop with explicit `if rowCount > 0` before iterating.

### Prevention checklist
- Any `for 0 to size-1` over dynamic arrays must be wrapped with `if size > 0`.
- Apply the same pattern in all table/data renderers that use dynamic row lists.
    ...
```

### Prevention checklist
- When extracting code into helper blocks, scan for “reads” of locals and ensure declarations stay above the first read.
- If you need a value in multiple nested blocks, declare it once near the top of the parent block.

### Prevention checklist
- When splitting/refactoring large blocks, re-check local variable scope boundaries.
- If a value is used across multiple sibling blocks, either:
  - redeclare in each block, or
  - lift declaration to a shared parent scope.
- Search for `Undeclared identifier` after introducing helper variables in nested blocks.

---

## Pine compile: `Could not find function or function reference 'ta.sum'`

### Symptom
TradingView reports:
- `Could not find function or function reference 'ta.sum'`

### Root cause (this project instance)
Used `ta.sum(series, length)` for debug rolling-window counters; environment rejected the namespaced call.

### Fix applied
Replaced rolling-window sums with a compatible cumulative-delta pattern:

```pine
cumv = ta.cum(cond ? 1.0 : 0.0)
win = cumv - nz(cumv[length], 0.0)
```

### Prevention checklist
- Prefer compatibility-safe `ta.cum` + delta for rolling event counts in Pine.
- If `ta.sum` is used, verify compile on TradingView before proceeding.
- Keep debug counters isolated so replacing implementation does not affect trading logic.

---

## Pine compile: `Cannot modify global variable 'X' in function`

### Symptom
TradingView reports:
- `Cannot modify global variable 'dbgCpPattern' in function`

### Root cause (this project instance)
The script tried to assign to global `var` state inside a function (`apply_candle_pattern_confluence(...)`), which Pine disallows.

### Fix applied
Removed global state mutation inside the function and computed debug values directly in a dedicated render function:

```pine
draw_candle_confluence_debug() =>
    int p = get_candle_pattern()
    ...
```

### Prevention checklist
- Do not mutate global `var` variables from inside user functions.
- Return values from functions and assign at call sites, or compute UI/debug values locally in render functions.
- When adding temporary debug state, prefer pure calculations over cross-function mutable globals.

---

## Pine runtime: `requested historical offset is beyond the historical buffer's limit`

### Symptom
TradingView runtime error (example):
- `The requested historical offset (8689) is beyond the historical buffer's limit (8688).`

### Root cause (this project instance)
Variable-offset series indexing in EQH/EQL validation loops:
- `high[checkOff]` / `low[checkOff]`
- `checkOff` can grow very large when scanning old pivot ranges.

### Fix applied
Added a safe guard before dynamic history access:

```pine
if checkOff < 0 or checkOff > SAFE_DYNAMIC_OFFSET
    invalidated := true
    break
```

and introduced:

```pine
SAFE_DYNAMIC_OFFSET = 4000
```

### Prevention checklist
- Guard every variable-offset `series[offset]` access with bounds checks.
- Skip/short-circuit very old scans instead of trying to read deep history.
- Prefer bounded windows for validation loops on historical pivots.

### Additional trigger observed
- Label/box coordinate updates can also trigger this at runtime when setting `xloc.bar_index` coordinates too far back.
- Example path: `_controlZone(...)` `visualLabel.set_x(labelX)` where `labelX` derived from very old box coordinates.

### Additional fix pattern
Clamp draw coordinates before `set_x(...)`:

```pine
minLabelX = math.max(bar_index - SAFE_LABEL_BACK_BARS, 0)
maxLabelX = bar_index + 500
labelX = math.min(math.max(labelXRaw, minLabelX), maxLabelX)
```

---

## Pine compile: `Cannot call 'request.security' with argument 'timeframe'='X'. An argument of 'series string' type was used but a 'simple string' is expected.`

### Symptom
TradingView reports:
- `Cannot call 'request.security' with argument 'timeframe'='htf2'...`

### Root cause (this project instance)
`request.security()` timeframe argument used a runtime string (`htf1`, `htf2`, `tf`) derived from arrays/logic.
Pine requires a compile-time simple string timeframe when `dynamic_requests` is not enabled.

### Fix applied
Replaced dynamic timeframe calls with fixed-literal routing:

```pine
[b15, s15] = request.security(syminfo.tickerid, "15", get_trend_data(len))
[b240, s240] = request.security(syminfo.tickerid, "240", get_trend_data(len))
[b1d, s1d] = request.security(syminfo.tickerid, "1D", get_trend_data(len))
[b1w, s1w] = request.security(syminfo.tickerid, "1W", get_trend_data(len))

[b, s] = tf == "15" ? [b15, s15] : tf == "240" ? [b240, s240] : tf == "1D" ? [b1d, s1d] : tf == "1W" ? [b1w, s1w] : [0, 0]
```

### Prevention checklist
- Never pass runtime timeframe strings directly into `request.security`.
- Use fixed-timeframe prefetch + select.
- Keep supported TF list explicit (`15`, `240`, `1D`, `1W`) unless script is changed to dynamic requests mode.

---

## Pine compile/runtime rule: `Cannot use request.*() call within loops or conditional structures, when dynamic_requests is false`

### Symptom
TradingView reports:
- `Cannot use request.*() call within loops or conditional structures...`

### Root cause (this project instance)
`request.security()` was placed in `if/else` branches in helper functions.
Even with literal timeframes, `request.*` is disallowed inside conditionals/loops when `dynamic_requests=false`.

### Fix applied
Move all `request.security()` calls to unconditional statements, then select results afterward:

```pine
[h15, l15, o15, c15] = request.security(syminfo.tickerid, "15", [high, low, open, close])
[h240, l240, o240, c240] = request.security(syminfo.tickerid, "240", [high, low, open, close])
[h1d, l1d, o1d, c1d] = request.security(syminfo.tickerid, "1D", [high, low, open, close])
[h1w, l1w, o1w, c1w] = request.security(syminfo.tickerid, "1W", [high, low, open, close])

[h, l, o, c] = tf == "15" ? [h15, l15, o15, c15] : tf == "240" ? [h240, l240, o240, c240] : tf == "1D" ? [h1d, l1d, o1d, c1d] : tf == "1W" ? [h1w, l1w, o1w, c1w] : [na, na, na, na]
```

### Prevention checklist
- Do not put `request.*` inside `if`, `else`, `for`, `while`.
- Use unconditional prefetch at function top or global scope.
- Then branch/select only on already-fetched series.

---

## Pine tuple assignment: `Cannot assign a variable to a tuple` / `Syntax error at input '['` in mixed tuple expressions

### Symptom
TradingView reports:
- `Cannot assign a variable to a tuple...`
- `Syntax error at input '['`

### Root cause (this project instance)
Tuple destructuring was used with unsupported forms:
- ternary expression returning tuple directly in assignment
- tuple reassignment with `:=` in local branches
- non-function RHS in tuple contexts

### Fix applied
Use Pine-safe tuple patterns:

```pine
// Safe: tuple from if-structure returning tuple
[h1, l1, o1, c1] = if not na(htf1)
    get_ohlc_for_tf(htf1)
else
    [na, na, na, na]
```

For non-trivial multi-value returns, use a UDT instead of tuple (more robust in nested logic).

### Prevention checklist
- Tuple assignment RHS should be a tuple-returning function call or `if/switch` structure.
- Avoid tuple `:=` reassignment inside branches.
- Prefer UDT return objects when values are passed through multiple layers.

---

## Pine runtime array guard: `array.get() Index -1 is out of bounds, array size is 0`

### Symptom
TradingView reports:
- `Error on bar X: In 'array.get()' function. Index -1 is out of bounds, array size is 0`

### Root cause (this project instance)
Code used a short-circuit expression like:

```pine
bool ok = array.size(arr) == 0 or array.get(arr, array.size(arr) - 1) != v
```

In this script path, Pine still evaluated the `array.get(...)` branch on early bars, producing `-1` index access.

### Fix applied
Use explicit guarded branching before `array.get(...)`:

```pine
bool ok = true
int n = array.size(arr)
if n > 0
    ok := array.get(arr, n - 1) != v
```

### Prevention checklist
- Never rely on `or/and` short-circuit to protect `array.get(...)`.
- Always compute `n = array.size(...)` once and guard with `if n > 0`.
- Prefer explicit branches in library helpers used by early-bar HTF logic.

---

## Pine library forward-reference: `Could not find function or function reference 'X'` (even though X exists later)

### Symptom
TradingView reports:
- `Could not find function or function reference 'zones_overlap'`

### Root cause (this project instance)
In `library()` scripts, some functions (especially when used inside exported functions) failed to resolve forward references reliably when the callee function was defined later in the file.

### Fix applied
Move the dependency function **above** its first usage (or inline it).

### Prevention checklist
- When migrating helpers into `TradingKit`, move/define dependency helpers *before* they are called.
- If you see this error and the function clearly exists, first suspect ordering/forward-ref, not a missing rename.

---

## `request.security()` timeframe must be `simple string` (function args become `series string`)

### Symptom
TradingView reports:
- `Cannot call 'request.security' with argument 'timeframe'='tf'. An argument of 'series string' type was used but a 'simple string' is expected.`

### Root cause (this project instance)
Wrapping `request.security(..., tf, ...)` inside a helper like `f(string tf) => request.security(..., tf, ...)` makes `tf` a `series string` inside the function, even if the caller passes a literal or simple timeframe.

### Fix applied
Inline the security call at top-level using the timeframe variable directly (e.g. `htf1`, `htf2`) and keep the helper only for the *expression* (no timeframe parameter).

### Prevention checklist
- Do not pass timeframe strings into functions that call `request.security()`.
- If you need reuse, write helpers that return the expression tuple and call `request.security()` at the call site.
