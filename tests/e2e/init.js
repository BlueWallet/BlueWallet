const detox = require('detox');

// Set the default timeout
// jest.setTimeout(1200000); // 20 min

beforeAll(async () => {
  // await detox.init(config);
  await device.launchApp();
});

// beforeEach(async () => {
//   const lockFile = '/tmp/travislock.' + hashIt(expect.getState().currentTestName);
//   if (process.env.TRAVIS) {
//     if (require('fs').existsSync(lockFile))
//       // speeds up test pass
//       return;
//   }
//   await adapter.beforeEach();
// });

afterAll(async () => {
  // await adapter.afterAll();
  await detox.cleanup();
});

// function hashIt(s) {
//   const createHash = require('create-hash');
//   return createHash('sha256').update(s).digest().toString('hex');
// }
