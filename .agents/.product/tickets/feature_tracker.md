# Feature Implementation Tracker

This file tracks the status of user-facing features and links them to technical tickets.

## Technical Core
- **Database Schema**: [./architecture/db-schema.md]
- **External APIs**: [./architecture/external_apis.md]

## [ ] Chart Snapshots Symbols Panel Filters
- **Status**: Planned
- **Feature Doc**: [../features/1-plan/chart_snapshots_symbols_panel_filters.md]
- **Ticket**: [./2-backlog/2026-05-02-chart-snapshots-symbol-panel-filters-favorites.md]
- **Summary**: Add favorites/asset tabs and panel toggle in symbols selector (`Favourite | All | Crypto | Forex`) with favorites sourced from user settings.

## [ ] Chart Snapshots Componentized Async Chart Tiles
- **Status**: Planned
- **Feature Doc**: [../features/1-plan/chart_snapshots_componentized_async_charts.md]
- **Ticket**: [./2-backlog/2026-05-02-chart-snapshots-componentized-async-chart-tiles.md]
- **Summary**: Re-promoted to backlog with locked Chart Sync process and `MARKET_DATA:SYMBOL` cache contract.

## [x] AI Signal Engine
- **Status**: Done
- **Feature Doc**: [../features/2-done/ai_signal_engine.md]
- **Summary**: Multi-model AI analysis with context-aware trade generation.

## [x] MT5 Broker Bridge
- **Status**: Done
- **Feature Doc**: [../features/2-done/mt5_broker_bridge.md]
- **Summary**: Bi-directional real-time sync between Web Dashboard and MT5 EA.

## [x] Dashboard & Analytics
- **Status**: Done
- **Feature Doc**: [../features/2-done/dashboard_analytics.md]
- **Summary**: High-density trading performance and risk management metrics.

## [x] Trade Lifecycle Management
- **Status**: Done
- **Feature Doc**: [../features/2-done/trade_lifecycle.md]
- **Summary**: Full control over trade entry, modifications, and automated sync.

## [x] Auth & Identity
- **Status**: Done
- **Feature Doc**: [../features/2-done/auth_and_identity.md]
- **Summary**: Secure multi-user isolation and role-based access control.

## [x] System Logging & Audit
- **Status**: Done
- **Feature Doc**: [../features/2-done/system_logging.md]
- **Summary**: Comprehensive logging of execution, AI analysis, and synchronization.

## [x] Unified Settings Dashboard
- **Status**: Done
- **Feature Doc**: [../features/2-done/settings_dashboard.md]
- **Summary**: Centralized management of API keys, symbols, and cron jobs with caching.

## [x] Market Data & Charting
- **Status**: Done
- **Feature Doc**: [../features/2-done/market_data_api.md]
- **Summary**: Real-time chart visualization and unified symbol ingestion.

## [x] Telegram Notifications
- **Status**: Done
- **Feature Doc**: [../features/2-done/telegram_notifications.md]
- **Summary**: Real-time alerts for signals, trades, and system health.

## [x] Economic Calendar (News Feed)
- **Status**: Done
- **Feature Doc**: [../features/2-done/economic_calendar.md]
- **Summary**: High-impact news filtering from ForexFactory.

## [x] Trade Persistence & Metadata
- **Status**: Done
- **Feature Doc**: [../features/2-done/trade_persistence.md]
- **Summary**: Reliable storage of trade status and raw AI analysis JSON in PostgreSQL.
