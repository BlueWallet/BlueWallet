/**
 * @fileOverview to combat flakiness of jest integration tests we implement a diy retry mechanism:
 * a custom reporter writes a lock file in /tmp for each successfull testcase.
 * then when a test suite is restarted, a custom environment checks if a testcase passed previously and
 * forcefully skips such test cases.
 */
class CustomReporter {
  constructor(globalConfig, reporterOptions, reporterContext) {
    this._globalConfig = globalConfig;
    this._options = reporterOptions;
    this._context = reporterContext;
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

module.exports = CustomReporter;
