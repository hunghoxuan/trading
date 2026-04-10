const fs = require('fs');

function renameTypes(file) {
    let content = fs.readFileSync(file, 'utf8');

    // Replace PriceZone -> PDArray
    content = content.replace(/\bPriceZone\b/g, 'PDArray');
    // Replace StrategyDef -> EntryModelDef
    content = content.replace(/\bStrategyDef\b/g, 'EntryModelDef');
    // Replace Event -> Trigger (but ignore DISP_EVENT)
    content = content.replace(/\bEvent\b(?!")/g, 'Trigger');
    // Replace Entry -> Trade (but ignore DISP_ENTRY)
    content = content.replace(/\bEntry\b(?!")/g, 'Trade');

    fs.writeFileSync(file, content);
    console.log("Renamed in " + file);
}

renameTypes('./src/TradingKitCore.pine');
