# Pine Script v5 — Common Errors Reference

> **Purpose:** Refer to this document BEFORE writing or editing any Pine Script code.  
> All errors below were encountered in real sessions and are confirmed Pine v5 issues.

---

## ❌ ERROR 1 — `if` statement single-line colon syntax

### Error
```
Syntax error: unexpected token ':'
```

### Bad Code
```pine
if x > 0 : x -= 1          // ❌ C-style — NOT valid in Pine v5
if cond : doSomething()     // ❌ Same issue
```

### Fix
```pine
// ✅ Pine v5 always requires the body on its own INDENTED line
if x > 0
    x -= 1
```

### Notes
- Pine uses **indentation** to define blocks, not colons or braces.
- Single-line `if` is **not** supported at all in Pine v5.
- Ternary `condition ? trueVal : falseVal` is valid but only for **expressions**, not statements.

---

## ❌ ERROR 2 — Non-literal default parameter values in `method` / function definitions

### Error
```
Default value must be a literal
```

### Bad Code
```pine
method zone_new_line(SMC_Zone z, string style = line.style_dotted, int width = 1) =>  // ❌
method zone_new_box(SMC_Zone z, color bgCol = color.new(color.teal, 80)) =>           // ❌
```

### Fix
```pine
// ✅ Remove the default — pass argument explicitly at every call-site
method zone_new_line(SMC_Zone z, string style, int width) =>
// Call-site:
z.zone_new_line(..., line.style_dotted, 1)
```

### Notes
- Pine v5 **only allows true literals** as default values: `0`, `1`, `""`, `true`, `false`, `na`.
- Built-in named constants (`line.style_dotted`, `size.tiny`, `color.white`, `label.style_none`) are **evaluated values**, not literals — they are **not allowed** as defaults.
- `color.new(...)` calls are also not allowed as defaults.
- **Rule of thumb:** If you can't write it as a bare number/string/bool/na, it cannot be a default.

---

## ❌ ERROR 3 — UDT field references a type defined later in the file

### Error
```
'ZigZagTracker' is not a valid type keyword.
```

### Bad Code
```pine
// Line 305 — timeframeInfo references ZigZagTracker
type timeframeInfo
    ZigZagTracker msTracker = na    // ❌ ZigZagTracker defined at line 1805!

// ...1500 lines later...
// Line 1805
type ZigZagTracker
    ...
```

### Fix
```pine
// ✅ Move the referenced type ABOVE the type that uses it
type ZigZagTracker      // defined FIRST
    ...

type timeframeInfo      // defined AFTER — can now safely reference ZigZagTracker
    ZigZagTracker msTracker = na    // ✅
```

### Notes
- Pine v5 requires **forward declarations** to be resolved at parse time.
- A `type` block can only reference another UDT that is **already defined earlier in the file**.
- This also applies to `init_*` constructor functions — move them above the type that calls them during initialization.
- **Rule of thumb:** Always define dependency types **above** the types that use them.

---

## ❌ ERROR 4 — Non-literal defaults inside `type` field definitions

Same as Error 2 but for UDT fields.

### Bad Code
```pine
type SMC_Zone
    string style = line.style_dotted   // ❌ built-in constant not allowed as field default
    color  col   = color.new(color.teal, 80)  // ❌ function call not allowed
```

### Fix
```pine
type SMC_Zone
    string style = na     // ✅ use na, then assign at construction time
    color  col   = na     // ✅
```

---

## ❌ ERROR 5 — Modifying a UDT field inside a loop over the array it belongs to

### Pattern (subtle bug, no compile error — runtime logic bug)
```pine
// Removing from array while iterating forward — skips elements!
for i = 0 to arr.size() - 1
    z = arr.get(i)
    if z.condition
        arr.remove(i)   // ❌ shifts all elements left, next element is skipped
```

### Fix
```pine
// ✅ Always iterate BACKWARDS when removing elements
for i = arr.size() - 1 to 0
    z = arr.get(i)
    if z.condition
        arr.remove(i)   // safe — elements to the right are unaffected
```

---

## ❌ ERROR 6 — `var` keyword inside a function body

### Error
```
Variables with the 'var' modifier cannot be declared inside a local scope.
```

### Bad Code
```pine
myFunc() =>
    var int count = 0    // ❌ var is not allowed inside functions/methods
    count += 1
```

### Fix
```pine
// ✅ Declare the var at global scope, pass it as a parameter
var int count = 0

myFunc(int _count) =>
    _count + 1

count := myFunc(count)
```

### Notes
- `var` (persistent across bars) is only valid at **script (global) scope** or as a **UDT field** (which is implicitly persistent).
- The pattern for HTF-safe persistent state: store it inside a `type` field and pass the UDT as a parameter.

---

## ❌ ERROR 7 — `request.security()` inside a function that is called on every bar

### Pattern (causes "Security call not allowed in loops/conditions" error)
```pine
myFunc() =>
    [h, l] = request.security(syminfo.tickerid, "D", [high, low])  // ❌ if called conditionally
    ...

if someCondition
    myFunc()   // ❌ request.security inside conditional call
```

### Fix
```pine
// ✅ Call request.security at the TOP LEVEL (global scope), store result, pass into function
[htf_h, htf_l] = request.security(syminfo.tickerid, "D", [high, low])

myFunc(float _h, float _l) =>
    ...

if someCondition
    myFunc(htf_h, htf_l)   // ✅
```

---

## ✅ Quick Reference Checklist

Before writing any new Pine v5 code, verify:

| Check | Rule |
|---|---|
| `if` blocks | Body must be on a **new indented line** — never `if x : y` |
| Default params | Only `0`, `1`, `""`, `true`, `false`, `na` — **no built-in constants** |
| UDT field types | Referenced type must be **defined earlier in file** |
| Array iteration + removal | Always iterate **backwards** (`size()-1 to 0`) |
| `var` keyword | Only at **global scope** or in UDT fields |
| `request.security` | Only at **global scope**, never inside conditional/loop |
| Ternary `?:` | Only for **expressions** (values), not for statements |

---

*Last updated: 2026-02-24 — Hung Bot refactoring session*
