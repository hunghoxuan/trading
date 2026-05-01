# Skill: UI Web Development

Use this skill for building high-density, professional dashboards using React and Vanilla CSS.

## Operational Rules

1.  **Design System First**: Use established CSS tokens (`--bg`, `--surface`, `--accent`).
2.  **Micro-Animations**: All interactive elements must have hover/active states and subtle fade-ins.
3.  **Consistency**: Use the `showDateTime` utility for all timestamps (24h clock, no seconds, no AM/PM).

## Implementation Flow

1.  **Layout**:
    - Use `.stack-layout` for vertical grouping.
    - Use `.toolbar-panel` for action rows (Left: Pagination | Right: Search/Create).
2.  **Components**:
    - Implement sortable headers for all tables.
    - Group metrics in high-density cards for the dashboard.
3.  **Styling**:
    - Apply `fadeIn` classes to new panels.
    - Ensure 100% responsiveness (test Mobile vs. Desktop).

## Verification Checklist
- [ ] Matches CSS tokens.
- [ ] Responsive at 375px.
- [ ] No layout shifts.
- [ ] Consistent time formatting.
