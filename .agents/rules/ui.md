# UI Rules

- Follow existing design system first.
- Use dense, work-focused layouts for trading/admin tools.
- Page wrapper: `stack-layout fadeIn`.
- Toolbar:
  - left: pagination/count
  - right: filters, bulk actions, primary action
- Buttons:
  - primary: create/apply/save
  - secondary: navigation/utility
  - danger: destructive
- Forms:
  - label above input
  - validation directly below related input/group
  - form-level error above action buttons
  - disabled + spinner while submitting
  - save/add/submit enabled only when dirty and valid
- Feedback colors:
  - error red
  - warning yellow
  - success green
- Never render credentials.
- Time display uses `showDateTime`.

