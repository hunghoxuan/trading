# Feature: Unified Settings Dashboard

## User Flow
A single control panel to manage API keys (Gemini, Claude, OpenAI), symbols, and automated cron jobs.

## Key Capabilities
- **High Performance**: Caching system (StateRepo) reduces DB hits for setting reads.
- **Security**: Sensitive keys are encrypted in DB and only decrypted on-demand via the "Reveal" UI.
- **Dynamic Controls**: Inline toggles for cron job status (Active/Inactive).

## Implementation Details
- **Backend**: `StateRepo` bucket `USER_SETTINGS` (6h TTL).
- **Frontend**: `SettingsPage.jsx` with unified "CONFIGURATIONS" view.
- **Storage**: `user_settings` table with `type` and `name` unique constraints.
