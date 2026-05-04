
const axios = require('axios');

async function testVpsAuth() {
    const url = 'https://trade.mozasolution.com/webhook/v2/broker/pull';
    const apiKey = 'acc_fab38ed32ecde9b28b3dd33d8be10a77da6a';
    
    console.log(`[TEST] Probing VPS at ${url}`);
    console.log(`[TEST] Using API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);
    
    try {
        const response = await axios.get(url, {
            headers: {
                'x-api-key': apiKey
            },
            timeout: 5000
        });
        console.log('[SUCCESS] VPS responded:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('[FAILED] VPS rejected request:', error.response.status, error.response.data);
        } else {
            console.error('[FAILED] Connection error:', error.message);
        }
    }
}

testVpsAuth();
