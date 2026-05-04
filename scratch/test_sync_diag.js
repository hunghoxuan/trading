
const https = require('https');

const data = JSON.stringify({
  account_id: "12345",
  balance: 1000,
  equity: 1000,
  margin: 0,
  free_margin: 1000,
  positions: [],
  orders: [],
  closed: []
});

const options = {
  hostname: 'trade.mozasolution.com',
  port: 443,
  path: '/mt5/ea/sync-v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'acc_fab38ed32ecde9b28b3dd33d8be10a77da6a',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
