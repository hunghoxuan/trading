# System Database Schema (v2.2)

The system uses a PostgreSQL database with a normalized, multi-user schema.

## 1. Identity & Access
### `users`
Central identity table.
- `user_id`: Primary Key (TEXT)
- `name`, `email`: Profile info
- `password_hash`, `password_salt`: Secure auth
- `metadata`: Flexible JSONB profile data

### `user_accounts`
Links users to specific broker instances (MT5, Binance, etc.)
- `account_id`: Primary Key (TEXT)
- `user_id`: Foreign Key (-> users)
- `balance`: Real-time equity/balance tracking
- `api_key_hash`: Secure storage of broker keys

## 2. Trading Engine
### `signals`
Stores the output of AI Analysis or manual signal triggers.
- `signal_id`: Primary Key (TEXT)
- `symbol`, `side`, `order_type`: Core trade parameters
- `entry`, `sl`, `tp`: Planned price levels
- `raw_json`: Complete AI analysis payload (for audit)
- `status`: NEW, PROCESSED, REJECTED

### `trades`
Stores individual execution attempts for each account.
- `trade_id`: Primary Key (TEXT)
- `account_id`: Foreign Key (-> user_accounts)
- `signal_id`: Foreign Key (-> signals)
- `broker_trade_id`: The ID returned by MT5/Broker
- `execution_status`: PENDING, PLACED, FILLED, CLOSED
- `volume`, `entry_exec`, `sl_exec`, `tp_exec`: Final execution prices
- `pnl_realized`: Realized profit/loss

## 3. Configuration & Audit
### `user_settings`
Unified storage for API keys, symbols, and cron job schedules.
- `type`: Category (api_key, symbols, cron)
- `name`: Unique name within the type
- `data`: JSONB payload
- `status`: ACTIVE, INACTIVE

### `logs`
Universal audit trail for every system event.
- `object_id`: ID of the related signal/trade/account
- `object_table`: Name of the source table
- `metadata`: JSONB event payload (event_type, error_message, etc.)

## 4. Market & Cache
### `market_data`
Cached chart data for AI context.
- `symbol`, `tf`: Symbol and Timeframe
- `bar_start`, `bar_end`: Time range
- `data`: Compressed price data

### `ea_logs`
Direct logs received from the MT5 Expert Advisor.
