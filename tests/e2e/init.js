const detox = require('detox');

beforeAll(async () => {
  await device.launchApp();
});

afterAll(async () => {
  await detox.cleanup();
});
