import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import { CONST, Transaction, Filters, TagsType } from 'app/consts';

import { satoshiToBtc } from '../../utils/bitcoin';

const i18n = require('../../loc');

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const filterByTransactionType = (transactions: Transaction[], type?: string): Transaction[] => {
  if (type === CONST.send) {
    return transactions.filter(transaction => Number(transaction.value) < 0);
  }
  return transactions.filter(transaction => Number(transaction.value) > 0);
};

const filterByAddress = (transactions: Transaction[], address: string, type?: string): Transaction[] =>
  type === CONST.receive
    ? transactions.filter(transaction => transaction.inputs.some(input => input.addresses.includes(address)))
    : transactions.filter(transaction => transaction.outputs.some(output => output.addresses.includes(address)));

const filterByFromDate = (transactions: Transaction[], fromDate: string): Transaction[] => {
  return transactions.filter(transaction => {
    if (!transaction.received) {
      return;
    }

    return dayjs(fromDate).isSameOrBefore(transaction.received, 'day');
  });
};

const filterByToDate = (transactions: Transaction[], toDate: string): Transaction[] => {
  return transactions.filter(transaction => {
    if (!transaction.received) {
      return;
    }

    return dayjs(toDate).isSameOrAfter(transaction.received, 'day');
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

export const filterByTags = (transactions: Transaction[], tags: TagsType[]): Transaction[] => {
  return transactions.filter(transaction => transaction.tags.some(t => tags.includes(t)));
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
  const tags =
    filters.transactionType === CONST.receive ? filters.transactionReceivedTags : filters.transactionSentTags;
  return tags.length === 0 ? fileteredByToAmount : filterByTags(fileteredByToAmount, tags);
};
