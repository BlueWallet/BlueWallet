const i18n = require('../loc');

export class AppError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

export class DoubleSpentFundsError extends AppError {
  constructor(message = i18n.send.error.doubleSpentFunds) {
    super(message);
  }
}

export class NotExistingFundsError extends AppError {
  constructor(message = i18n.send.error.notExistingFunds) {
    super(message);
  }
}

export class DustError extends AppError {
  constructor(message = i18n.send.error.dust) {
    super(message);
  }
}

export class BroadcastError extends AppError {
  constructor(message: string) {
    const messages = message.split('\n');
    const generalMsg = messages[0];
    const detailedMsg = messages[2];
    const errorMsg = `${generalMsg}: ${detailedMsg}`;

    super(errorMsg);
  }
}

export class ElectrumXConnectionError extends AppError {
  constructor(message = i18n.connectionIssue.electrumXNotConnected) {
    super(message);
  }
}
