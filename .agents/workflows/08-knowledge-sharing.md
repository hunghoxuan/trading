---
description: Always update and share critical content/knowledge in the conversation
---

# Knowledge Sharing Workflow

- **Objective:** Ensure that useful information, discovered bugs, algorithmic patterns, and crucial business logic decisions extracted during the conversation are actively documented and shared.
- **Why:** This prevents duplicated research efforts, saves context-gathering tokens, and highly optimizes the efficiency of future conversations or other co-working AI agents joining the repository.
- **How to execute:**
  - Whenever a major piece of logic is resolved (e.g., "TradingView handles % risk based on initial_capital property, not dynamically"), capture and summarize it.
  - Distill this valuable information and store it securely in the appropriate persistent knowledge base (either as a project-level markdown file inside `.agents/` or as a system-level KI / Knowledge Item).
  - Explicitly map these findings to ensure the context seamlessly carries over to subsequent agents working on the codebase.
