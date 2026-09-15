/**
 * @fileOverview to combat flakiness of jest integration tests we implement a diy retry mechanism:
 * a custom reporter writes a lock file in /tmp for each successfull testcase.
 * then when a test suite is restarted, a custom environment checks if a testcase passed previously and
 * forcefully skips such test cases.
 *
 * Also prints every skipped test after the Jest summary so env-gated skips are visible
 * without --verbose (which would also dump every passing test).
 */
class CustomReporter {
  constructor(globalConfig, reporterOptions, reporterContext) {
    this._globalConfig = globalConfig;
    this._options = reporterOptions;
    this._context = reporterContext;
  }

  onRunComplete(_contexts, results) {
    if (!results) return;

    const skipped = [];
    for (const suite of results.testResults) {
      for (const test of suite.testResults) {
        if (test.status === 'pending' || test.status === 'skipped' || test.status === 'disabled') {
          skipped.push(test);
        }
      }
    }
    if (skipped.length === 0) return;

    skipped.sort((a, b) => a.fullName.localeCompare(b.fullName));
    console.log('\nSkipped tests (%d):', skipped.length);
    for (const test of skipped) {
      const reason = skipReason(test);
      const name = stripSkipReason(test.fullName);
      console.log('  ○ %s', name);
      console.log('      %s', reason);
    }
    console.log('');
  }

  onTestCaseResult(test, testCaseResult) {
    if (!process.env.RETRY) return;

    // since we cant distinguish several testcases in `it.each(...)`, we just ignore them so they will always run
    if (testCaseResult.fullName.includes('can fetch balance, transactions & utxo, disableBatching=')) return;
    if (testCaseResult.fullName.includes('BlueElectrum can do multiGetBalanceByAddress(), disableBatching=')) return;
    if (testCaseResult.fullName.includes('ElectrumClient can do multiGetHistoryByAddress(), disableBatching=')) return;
    if (testCaseResult.fullName.includes('ElectrumClient can do multiGetTransactionByTxid(), disableBatching=')) return;
    if (testCaseResult.fullName.includes('ElectrumClient can do multiGetHistoryByAddress() to obtain txhex, disableBatching=')) return;
    if (testCaseResult.fullName.includes('addresses for vout missing')) return;
    if (testCaseResult.fullName.includes('txdatas were coming back null from BlueElectrum because of high batchsize')) return;

    const hash = require('crypto').createHash('md5').update(testCaseResult.fullName).digest('hex');
    if (testCaseResult.status === 'passed') {
      // marking testcase as passed in /tmp
      require('fs').writeFileSync(`/tmp/${hash}`, '1');
    }
  }
}

const ENV_SKIP_SUFFIX = / \([^)]+ not set\)/g;
const RETRY_SKIP_SUFFIX = / \(previously passed on CI\)/g;
const ENV_SKIP_CAPTURE = /\(([^)]+ not set)\)/;
const ENV_SKIP_CAPTURE_END = /\(([^)]+ not set)\)$/;

function skipReason(test) {
  const envMatch =
    ENV_SKIP_CAPTURE.exec(test.title) || (test.ancestorTitles || []).map(title => ENV_SKIP_CAPTURE_END.exec(title)).find(Boolean);
  if (envMatch) return envMatch[1];
  if (/\(previously passed on CI\)/.test(test.title) || /\(previously passed on CI\)/.test(test.fullName)) {
    return 'previously passed on CI';
  }
  return 'explicitly skipped';
}

function stripSkipReason(fullName) {
  return fullName.replace(ENV_SKIP_SUFFIX, '').replace(RETRY_SKIP_SUFFIX, '');
}

module.exports = CustomReporter;
