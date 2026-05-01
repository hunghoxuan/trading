Mode: BIG-PASS
Goal: <big feature outcome>

Rules:
1) One-pass only per package, no micro steps.
2) Auto-continue to next package until Goal is fully done.
3) Do not ask for confirmation unless blocked/ambiguous.
4) Each package must include:
- code changes
- version bump
- snapshot in src-versions/MMdd-{index}
- whats-done.md
- roadmap/status update
5) After each package, report only:
- done
- next package
- ETA
6) Stop only when:
- Goal completed, or
- hard blocker found.

Definition of done:
- <your acceptance criteria>