# Raw Layer (User-Owned, Append-Only)

This folder is user input memory.

Rules:
- User-owned: AI should not edit raw records unless explicitly asked.
- Append-only records.
- Keep original timestamps and source links.
- Do not store secrets.

Suggested content:
- user notes
- incident/debug transcripts
- command outputs worth preserving
- external references before distillation

Flow:
- Keep source material in `raw`.
- Distill durable meaning into `.agents/wiki/`.
- Convert hard process constraints into `.agents/rules/`.
