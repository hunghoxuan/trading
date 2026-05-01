# Skill: Browser Testing

Use this skill for verifying UI runtime behavior, responsiveness, and state management.

## Request Template

```text
Task: Browser-Test
Target URL: (e.g. /dashboard/analytics)
Viewport: (Desktop/Mobile/Tablet)
Focus: (Visual/Logic/Auth/Form)
```

## Operational Rules

1.  **Console First**: Always check for JavaScript errors in the console before reporting a bug.
2.  **Network Audit**: Verify that all API requests return 2xx or 3xx status codes.
3.  **Responsive Check**: Test at least two breakpoints (1440px and 375px).

## Implementation Flow

1.  **Environment Setup**:
    - Preferred: Use the in-app browser or Playwright automation.
    - Fallback: Connect to a remote debugging port if using a local browser.
2.  **Visual Inspection**:
    - Verify layout integrity and alignment.
    - Check hover states and micro-animations.
3.  **Logic Verification**:
    - Trigger form submissions and verify loading/success/error states.
    - Check if data updates correctly (e.g., polling or manual refresh).
4.  **Audit**:
    - Record console logs and take screenshots of any anomalies.

## Verification Checklist
- [ ] No console errors.
- [ ] No failed network requests.
- [ ] Correct rendering on Mobile Viewport.
- [ ] Form validation triggers correctly.
