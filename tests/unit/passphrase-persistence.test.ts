import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('HD wallet passphrase persistence', () => {
  it('serializes the passphrase set during creation and restores it from JSON', () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(MNEMONIC);
    wallet.setPassphrase('my passphrase');

    const restored = HDSegwitBech32Wallet.fromJson(JSON.stringify(wallet));

    expect(restored.getPassphrase()).toBe('my passphrase');
    expect(restored.getSecret()).toBe(MNEMONIC);
  });

  it('does not serialize a passphrase when none was set', () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(MNEMONIC);

    const restored = HDSegwitBech32Wallet.fromJson(JSON.stringify(wallet));

    expect(restored.getPassphrase()).toBeFalsy();
  });
});
