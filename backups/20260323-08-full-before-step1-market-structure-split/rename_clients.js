const fs = require('fs');

function renameTypes(file) {
    if (!fs.existsSync(file)) {
        console.log("File not found: " + file);
        return;
    }
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
    console.log("Renamed types in " + file);
}

renameTypes('./src/Hung - SMC.pine');
renameTypes('./src/Hung - Core.pine');
