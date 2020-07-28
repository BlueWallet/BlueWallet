import { groupBy, orderBy, map, compose } from 'lodash/fp';

import { Transaction } from 'app/consts';

import { formatDate } from '../../utils/date';

// @ts-ignore
const mapNoCap = map.convert({ cap: false });

type FP = (...args: any[]) => any;

export const getGroupedTransactions = (transactions: Transaction[], ...fps: FP[]) =>
  compose(
    mapNoCap((txs: Transaction[], date: string) => ({
      title: date,
      data: txs,
    })),
    groupBy(({ received }) => formatDate(received, 'll')),
    orderBy(['received'], ['desc']),
    ...fps,
  )(transactions) as [{ title: string; data: Transaction[] }];
