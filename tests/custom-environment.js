/**
 * @fileOverview see tests/custom-reporter.js for more information
 */
import NodeEnvironment from 'jest-environment-node';
class CustomEnvironment extends NodeEnvironment {
  async handleTestEvent(event) {
    if (event.name === 'test_start') {
      if (!process.env.RETRY) return;

      const fullName = (event.test.parent.name === 'ROOT_DESCRIBE_BLOCK' ? '' : event.test.parent.name + ' ') + event.test.name;
      const hash = require('crypto').createHash('md5').update(fullName).digest('hex');
      if (require('fs').existsSync(`/tmp/${hash}`)) {
        event.test.mode = 'skip';
        console.log('skipping as it previously passed on CI:', fullName);
      }
    }
  }
}

module.exports = CustomEnvironment;
