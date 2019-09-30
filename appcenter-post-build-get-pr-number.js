const https = require('https');

https.get('https://api.github.com/repos/BlueWallet/BlueWallet/pulls ', { headers: { 'User-Agent': 'BlueWallet bot' } }, resp => {
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
});
