const https = require('https');

const req = https.request(
  {
    hostname: 'api.github.com',
    port: 443,
    path: '/repos/BlueWallet/BlueWallet/pulls',
    method: 'GET',
    headers: { 'User-Agent': 'BlueWallet bot' },
  },
  resp => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', chunk => {
      data += chunk;
    });

    // The whole response has been received
    resp.on('end', () => {
      const prs = JSON.parse(data);
      for (let pr of prs) {
        if (process.env.APPCENTER_BRANCH === pr.head.ref) {
          console.log(pr.number);
        }
      }
    });
  },
);

req.on('error', e => {
  console.error(e);
});

req.end();
