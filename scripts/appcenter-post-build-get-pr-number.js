const https = require('https');

const auth = 'Basic ' + Buffer.from(process.env.GITHUB).toString('base64');

const branch = require('child_process')
  .execSync('git ls-remote --heads origin | grep $(git rev-parse HEAD) | cut -d / -f 3')
  .toString()
  .trim();

if (branch === 'master') process.exit();

const req = https.request(
  {
    hostname: 'api.github.com',
    port: 443,
    path: '/repos/BlueWallet/BlueWallet/pulls',
    method: 'GET',
    headers: { 'User-Agent': 'BlueWallet bot', Authorization: auth },
  },
  resp => {
    let data = '';

    resp.on('data', chunk => {
      data += chunk;
    });

    resp.on('end', () => {
      try {
        const prs = JSON.parse(data);
        for (let pr of prs) {
          if (branch === pr.head.ref) {
            console.log(pr.number);
          }
        }
      } catch (err) {
        console.log(err);
        console.log('got json: ', data);
      }
    });
  },
);

req.on('error', e => {
  console.error(e);
});

req.end();
