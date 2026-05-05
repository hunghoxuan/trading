# Feature: SSE Notification System

## User Flow
Real-time push notifications for all trading events, displayed as in-app toasts, a marquee ticker under the DayClock bar, browser notifications, console logs, and sounds — all configurable per event type.

## Key Capabilities
- **SSE Stream**: Server-Sent Events replacing 10s polling. One persistent `GET /v2/notifications/stream` connection per user.
- **Event Types**: trade_added, trade_updated, signal_added, broker_sync, news_alert, system_event, page_refresh, error.
- **Multi-Channel Output**: Each event can independently trigger: browser notification, console log, ticker marquee, page refresh, sound.
- **Ticker Bar**: Light gray scrolling text marquee under the SessionClock/DayClock bar, showing latest event messages.
- **Events Management Page**: `/system/events` — table of all event types with per-event toggles for each output channel.
- **User Settings Persistence**: Notification preferences stored as JSON in `user_settings` (type=`notification`, name=`preferences`).

## Payload Schema
```json
{
  "user_id": "string",
  "page": "string | null",
  "event": "trade_added | trade_updated | signal_added | broker_sync | news_alert | system_event | page_refresh | error",
  "message": "string",
  "type": "info | warning | error | success",
  "notification": true,
  "console_log": false,
  "ticker": true,
  "need_refresh": false,
  "sound": "NEW_SIGNAL | TRADE_FILLED | TRADE_CLOSED | NEWS_ALERT | SESSION_START | null"
}
```

## Technical Details
- **Endpoints**: `GET /v2/notifications/stream` (SSE, text/event-stream), `POST /v2/notifications/emit` (internal trigger), `GET /v2/notifications/events` (event type list), `GET/POST /v2/notifications/settings` (user prefs)
- **Backend**: In-memory event bus + `bumpPulse` refactored to emit SSE events. Redis pub/sub for cross-process fanout.
- **Frontend**: `EventSource` in `NotificationWatcher` replaces `setInterval(checkPulse)`. New `TickerBar` component. New `EventsPage` in system menu.
- **Storage**: `user_settings` row: type=`notification`, name=`preferences`, data=JSON of per-event toggles.

## UI Impact
- **New**: Ticker marquee bar under DayClock
- **New**: `/system/events` page in System dropdown
- **Modified**: `NotificationWatcher` (poll → SSE)
- **Modified**: `App.jsx` (System menu + TickerBar mount)
