beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000 * 30));
  await device.launchApp();
});
