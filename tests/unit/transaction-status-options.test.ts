import type { RouteProp } from '@react-navigation/native';

import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import getTransactionStatusOptions from '../../navigation/helpers/getTransactionStatusOptions';

const optionsFor = (tx?: DetailViewStackParamList['TransactionStatus']['tx']) =>
  getTransactionStatusOptions({
    route: {
      key: 'transaction-status-test',
      name: 'TransactionStatus',
      params: { hash: 'txid', walletID: 'wallet-id', tx },
    } as RouteProp<DetailViewStackParamList, 'TransactionStatus'>,
    screenWidth: 390,
    fontScale: 1,
    foregroundColor: '#ffffff',
    secondaryTextColor: '#999999',
  });

describe('getTransactionStatusOptions', () => {
  it('keeps a generic stack title so pushed screens get a meaningful back label', () => {
    const options = optionsFor({ hash: 'incoming', value: 1, timestamp: 1 } as any);
    expect(options.title).toBe(loc.transactions.details_title);
    expect(options.headerBackTitle).toBeUndefined();
    expect(options.headerTitle).toEqual(expect.any(Function));
    expect(optionsFor({ hash: 'outgoing', value: -1, timestamp: 1 } as any).title).toBe(loc.transactions.details_title);
  });

  it('uses the generic transaction title until transaction data is available', () => {
    const options = optionsFor();

    expect(options.title).toBe(loc.transactions.details_title);
    expect(options.headerTitle).toBe(loc.transactions.details_title);
  });
});
