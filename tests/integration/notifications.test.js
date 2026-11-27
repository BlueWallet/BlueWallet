import assert from 'assert';
import http from 'http';

import { isGroundControlUriValid } from '../../blue_modules/notifications';

/**
 * GroundControl URI validation against a local server instead of a public
 * service: the result is deterministic and the tests run offline. The server
 * answers like GroundControl on /ping, like another site on /other/ping, and
 * never answers on /hang/ping.
 */
describe('notifications · GroundControl URI validation', () => {
  let server;
  let base;
  const hanging = new Set();

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ description: 'GroundControl push server' }));
      } else if (req.url === '/other/ping') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>not a push server</html>');
      } else if (req.url === '/hang/ping') {
        hanging.add(res); // never answered: the client must give up on its own
      } else {
        res.writeHead(500);
        res.end();
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    for (const res of hanging) res.destroy();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  });

  it('accepts a server that answers /ping like GroundControl', async () => {
    assert.strictEqual(await isGroundControlUriValid(base), true);
  });

  it('rejects a server that answers with something else', async () => {
    assert.strictEqual(await isGroundControlUriValid(`${base}/other`), false);
    assert.strictEqual(await isGroundControlUriValid(`${base}/missing`), false);
  });

  it('gives up on a server that never answers', async () => {
    const started = Date.now();
    assert.strictEqual(await isGroundControlUriValid(`${base}/hang`, 300), false);
    assert.ok(Date.now() - started < 5000, 'the timeout must end the request');
  });

  it('rejects an address where nothing listens', async () => {
    assert.strictEqual(await isGroundControlUriValid('http://127.0.0.1:1', 2000), false);
  });
});
