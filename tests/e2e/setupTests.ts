import 'jest';

afterEach(async () => {
  await device.launchApp({ newInstance: true, delete: true });
});

afterAll(async () => {
  await device.terminateApp();
});
