import assert from 'assert';
import { renderHook, waitFor } from '@testing-library/react-native';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { useArkFeesReady } from '../../hooks/useArkFeesReady';

describe('useArkFeesReady', () => {
  it('turns true once an Arkade wallet loads its fees, and resets when the wallet changes', async () => {
    const ark = new LightningArkWallet();
    jest.spyOn(ark, 'ensureLightningFeesLoaded').mockResolvedValue();
    const hook = renderHook(({ wallet }: { wallet: unknown }) => useArkFeesReady(wallet), { initialProps: { wallet: ark as unknown } });
    await waitFor(() => assert.strictEqual(hook.result.current, true));

    hook.rerender({ wallet: new LightningCustodianWallet() });
    assert.strictEqual(hook.result.current, false);
  });

  it('stays false when the fees fail to load', async () => {
    const ark = new LightningArkWallet();
    const load = jest.spyOn(ark, 'ensureLightningFeesLoaded').mockRejectedValue(new Error('offline'));
    const hook = renderHook(() => useArkFeesReady(ark));
    await waitFor(() => assert.strictEqual(load.mock.calls.length, 1));
    assert.strictEqual(hook.result.current, false);
  });
});
