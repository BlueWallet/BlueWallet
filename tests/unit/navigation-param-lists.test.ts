import type { RootStackParamList } from '../../navigation/RootStackParamList';

describe('navigation param lists', () => {
  it('types nested navigator params with their child route params', () => {
    const params = {
      screen: 'SendDetails',
      params: { walletID: 'wallet-1' },
    } satisfies RootStackParamList['SendDetailsRoot'];

    expect(params).toEqual({ screen: 'SendDetails', params: { walletID: 'wallet-1' } });
  });

  it('requires params for direct root screens that consume them', () => {
    const params = { walletID: 'wallet-1' } satisfies RootStackParamList['WalletExport'];

    expect(params.walletID).toBe('wallet-1');
  });
});
