import moment from 'moment';

import { CONST, Transaction, Filters } from 'app/consts';

import { satoshiToBtc } from '../../utils/bitcoin';

const i18n = require('../../loc');

const filterByTransactionType = (transactions: Transaction[], type?: string): Transaction[] => {
  if (type === CONST.send) {
    return transactions.filter(transaction => Number(transaction.value) < 0);
  }
  return transactions.filter(transaction => Number(transaction.value) > 0);
};

const filterByAddress = (transactions: Transaction[], address: string, type?: string): Transaction[] => {
  if (type === CONST.send) {
    return transactions.filter(transaction => {
      const inputs: string[] = [];
      transaction.inputs.filter(input => {
        inputs.push(...input.addresses);
      });
      if (inputs.includes(address)) return transaction;
    });
  } else {
    return transactions.filter(transaction => {
      const outputs: string[] = [];
      transaction.outputs.filter(output => {
        outputs.push(...output.addresses);
      });
      if (outputs.includes(address)) return transaction;
    });
  }
};

const filterByFromDate = (transactions: Transaction[], fromDate: string): Transaction[] => {
  return transactions.filter(transaction => {
    if (!transaction.time) {
      return;
    }
    return (
      parseInt(
        moment(fromDate)
          .startOf('day')
          .format('X'),
      ) <= transaction.time
    );
  });
};

const filterByToDate = (transactions: Transaction[], toDate: string): Transaction[] => {
  return transactions.filter(transaction => {
    if (!transaction.received) {
      return;
    }
    return (
      parseInt(
        moment(toDate)
          .endOf('day')
          .format('X'),
      ) >=
      parseInt(
        moment(transaction.received)
          .endOf('day')
          .format('X'),
      )
    );
  });
};

const fileterByFromAmount = (transactions: Transaction[], fromAmount: string): Transaction[] => {
  return transactions.filter(transaction => {
    const amount = Number(fromAmount);
    if (Number.isNaN(amount)) {
      return true;
    }
    const val = satoshiToBtc(transaction.value).toNumber();
    return Math.abs(val) >= Math.abs(amount);
  });
};

const fileterByToAmount = (transactions: Transaction[], toAmount: string): Transaction[] => {
  return transactions.filter(transaction => {
    const amount = Number(toAmount);
    if (Number.isNaN(amount)) {
      return true;
    }
    const val = satoshiToBtc(transaction.value).toNumber();
    return Math.abs(val) <= Math.abs(amount);
  });
};

export const filterBySearch = (search: string, transactions: Transaction[]): Transaction[] =>
  transactions.filter(transaction => {
    const inputs: string[] = [];
    const outputs: string[] = [];
    transaction.inputs.filter(input => {
      inputs.push(...input.addresses);
    });
    transaction.outputs.filter(output => {
      outputs.push(...output.addresses);
    });
    return (
      transaction.note?.toLowerCase().includes(search) ||
      inputs.map(input => input.toLowerCase().includes(search)).includes(true) ||
      outputs.map(output => output.toLowerCase().includes(search)).includes(true) ||
      i18n
        .formatBalanceWithoutSuffix(Math.abs(Number(transaction.value)), transaction.walletPreferredBalanceUnit)
        .includes(search)
    );
  });

export const filterByStatus = (transactions: Transaction[], status: string): Transaction[] => {
  return transactions.filter(transaction => transaction.tx_type === status);
};

export const filterTransaction = (filters: Filters, transactions: Transaction[]): Transaction[] => {
  if (!filters.isFilteringOn) {
    return transactions;
  }
  const filteredByType = filterByTransactionType(transactions, filters.transactionType);
  const filteredbyAddress = filters.address
    ? filterByAddress(filteredByType, filters.address, filters.transactionType)
    : filteredByType;
  const filteredByFromDate = filters.fromDate
    ? filterByFromDate(filteredbyAddress, filters.fromDate)
    : filteredbyAddress;
  const filteredByToDate = filters.toDate ? filterByToDate(filteredByFromDate, filters.toDate) : filteredByFromDate;
  const fileteredByFromAmount = filters.fromAmount
    ? fileterByFromAmount(filteredByToDate, filters.fromAmount)
    : filteredByToDate;
  const fileteredByToAmount = filters.toAmount
    ? fileterByToAmount(fileteredByFromAmount, filters.toAmount)
    : fileteredByFromAmount;
  return filters.transactionStatus
    ? filterByStatus(fileteredByToAmount, filters.transactionStatus)
    : fileteredByToAmount;
};
