# Feature: Trade Lifecycle Management

## User Flow
Managing the full journey of a trade from "Pending" to "Closed".

## Key Capabilities
- **Manual Overrides**: Edit Entry, SL, TP, or Volume directly from the UI.
- **Cancellation**: Cancel pending orders before they are picked up by the EA.
- **Manual Closure**: Close open trades immediately with a single click.
- **Renewals**: Re-queue failed or cancelled trades for execution.
- **Automated Sync**: If a trade is closed on the broker (TP/SL hit), the dashboard reflects it automatically.

## Technical Details
- **Endpoints**: `/v2/trades/create`, `/mt5/trades/cancel`, `/mt5/trades/delete`, `/mt5/trades/renew`.
- **States**: `PENDING`, `PLACED`, `FILLED`, `CLOSED`, `CANCELLED`, `REJECTED`.
- **Validation**: Enforces `MAX_RISK_PCT` and `ALLOW_SYMBOLS` constraints before creating trades.
