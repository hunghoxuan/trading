const fs = require('fs');

function renameCoreVars(file) {
    if (!fs.existsSync(file)) {
        console.log("File not found: " + file);
        return;
    }
    let content = fs.readFileSync(file, 'utf8');

    // Rename arrays and tracking IDs
    content = content.replace(/\bentries\b/g, 'trades');
    content = content.replace(/\beventsQueue\b/g, 'triggersQueue');
    content = content.replace(/\beventStrategyIds\b/g, 'triggerModelIds');
    content = content.replace(/\bentryStrategyIds\b/g, 'tradeModelIds');

    // Rename Constants
    content = content.replace(/\bENTRY_TRACK_MAX_COUNT\b/g, 'TRADE_TRACK_MAX_COUNT');
    content = content.replace(/\bENTRY_RESOLVED_KEEP_BARS\b/g, 'TRADE_RESOLVED_KEEP_BARS');
    content = content.replace(/\bSHOW_STRATEGY_ENTRIES\b/g, 'SHOW_MODEL_TRADES');

    // Rename methods
    content = content.replace(/\bdraw_bias_row_under_entries\b/g, 'draw_bias_row_under_trades');
    content = content.replace(/\bdraw_data_entries_dashboard\b/g, 'draw_data_trades_dashboard');
    content = content.replace(/\bget_start_entries_count\b/g, 'get_start_trades_count');
    content = content.replace(/\bprune_pending_entries\b/g, 'prune_pending_trades');
    content = content.replace(/\bprocess_data_entries\b/g, 'process_data_trades');
    content = content.replace(/\bprocess_data_events_queue\b/g, 'process_data_triggers_queue');

    fs.writeFileSync(file, content);
    console.log("Renamed vars in " + file);
}

renameCoreVars('./src/Hung - Core.pine');
