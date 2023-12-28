const https = require('https');

const gitCommand = "git log -n 1 --pretty=%d HEAD | awk '{print $2}' | sed 's/origin\\///' | sed 's/)//'";
const branch = require('child_process').execSync(gitCommand).toString().trim();

if (branch === 'master') process.exit();

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

    resp.on('data', chunk => {
      data += chunk;
    });

    resp.on('end', () => {
      try {
        const prs = JSON.parse(data);
        for (const pr of prs) {
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
