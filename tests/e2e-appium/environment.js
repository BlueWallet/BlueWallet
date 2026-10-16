const { TestEnvironment } = require('jest-environment-node');

// Jest's bail stops between files. Stop remaining cases in the failed file too,
// after afterEach has preserved diagnostics and cleaned up the failed session.
class CatalystEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    this.failFast = config.projectConfig.testEnvironmentOptions.failFast;
    this.failed = false;
  }

  handleTestEvent(event) {
    if (!this.failFast) return;
    if (event.name === 'test_done' && event.test.errors.length > 0) this.failed = true;
    if (event.name === 'test_start' && this.failed && event.test.mode !== 'skip' && event.test.mode !== 'todo') {
      event.test.mode = 'skip';
      this.global.console.warn(`[Catalyst] Not run after first failure: ${event.test.name}`);
    }
  }
}

module.exports = CatalystEnvironment;
