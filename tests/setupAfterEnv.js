global.beforeEach(() => {
  if (process.env.TRAVIS || process.env.CI) return;
  process.stdout.write(jasmine.currentTest.fullName + '...\r');
});

global.afterEach(() => {
  if (process.env.TRAVIS || process.env.CI) return;
  if (jasmine.currentTest.failedExpectations.length) {
    process.stdout.write(jasmine.currentTest.fullName + '...FAIL\n');
  } else {
    process.stdout.write(jasmine.currentTest.fullName + '...OK\n');
  }
});

jasmine.getEnv().addReporter({
  specStarted: result => (jasmine.currentTest = result),
  specDone: result => (jasmine.currentTest = result),
});
