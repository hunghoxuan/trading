---
description: Durable Pine v5 compile/runtime pitfalls to prevent regressions
---

Use this checklist before and after refactor-heavy Pine changes.

## 1) Typed `na` for typed parameters

When a function expects typed args (`int`, `float`, `string`, ...), do not pass raw `na`.

- Use explicit casts: `int(na)`, `float(na)`, `string(na)`.
- Recheck fallback branches (`else`) after refactors.

Common error:
- `Cannot call '<fn>' with 'na' as a value for a non-typified argument`

## 2) Never leave conditional branches empty

In Pine, empty `if/else if/else` branches can trigger parser errors on the next branch line.

- If branch is intentionally empty, use explicit no-op:
  - `bool(na)`

Common error:
- `Mismatched input 'else' expecting 'end of line without line continuation'`

## 3) Guard historical offsets before series access

Any dynamic `x[offset]` must be bounded before access.

- Clamp offsets to safe limits.
- Prune cached indices/offsets by max age.

Common error:
- `The requested historical offset (...) is beyond the historical buffer's limit (...)`

## 4) Do not combine `array.size` + `array.get` in one condition

Avoid patterns like:
- `while array.size(a) > 0 and array.get(a, array.size(a)-1) ...`

Use:
1. size check first
2. compute index
3. `array.get` inside loop body

Common error:
- `array.get() Index -1 is out of bounds`

## 5) Wrap dynamic `for 0 to size-1` with size guard

Before iterating dynamic arrays:
- `if size > 0`
- then `for i = 0 to size - 1`

This is required in render/table loops too.

## 6) Removing from arrays: iterate backward

When deleting while iterating, loop from tail to head:
- `for i = array.size(a) - 1 to 0`

Never remove in a forward loop over the same array.

## 7) Global mutation constraints in functions

Pine often rejects mutating global state inside functions.

Preferred patterns:
- return updated value/object and assign at callsite
- use local temporary values, then assign once in outer scope
- use per-bar cache arrays/boxes for runtime cache state

Common error:
- `Cannot modify global variable '<x>' in function`

## 8) Exported function + `request.*()` restriction

For exported library functions, `request.*()` expression must not depend on exported function arguments.

Design pattern:
- keep `request.security` expressions independent from exported args
- move dynamic behavior to outer orchestration or non-exported helpers

Common error:
- `The request.*() call's expression cannot depend on the arguments of the exported function`

## 9) Validate scope after moving code across files

After moving helpers to KIT/lib:
- verify declaration order
- verify no “used before declared”
- verify no block-scope leak between sibling blocks

Common error:
- `Undeclared identifier '<x>'`
