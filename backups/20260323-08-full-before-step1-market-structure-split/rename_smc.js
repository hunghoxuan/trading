const fs = require('fs');

function renameTypes(file) {
    let content = fs.readFileSync(file, 'utf8');

    // Replace PriceZone -> PDArray
    content = content.replace(/\bPriceZone\b/g, 'PDArray');
    // Replace Event -> Trigger (but ignore DISP_EVENT if present)
    content = content.replace(/\bEvent\b(?!")/g, 'Trigger');
    // Replace Entry -> Trade
    content = content.replace(/\bEntry\b(?!")/g, 'Trade');
    // Replace StrategyDef -> EntryModelDef
    content = content.replace(/\bStrategyDef\b/g, 'EntryModelDef');

    fs.writeFileSync(file, content);
    console.log("Renamed in " + file);
}

renameTypes('./src/TradingKitSMC.pine');
