import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';
import { LegacyWallet } from '../../class/wallets/legacy-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { isWatchOnlySegwitBech32 } from '../../util/isWatchOnlySegwitBech32';

describe('isWatchOnlySegwitBech32', () => {
  test('returns true for a watch-only HDBech32 wallet', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6qLpbJKVYnGb61HgUUuG5jRsrQrJ2uFCuQTX2nyuwPMv8vs8bQbq1T3oLMcbBRp3J8yjHnSnMR7Ykg4ffF82qGjC2TkuKnoAHKPWDJNvYKS');
    w.init();
    expect(isWatchOnlySegwitBech32(w)).toBe(true);
  });

  test('returns false when wallet is not watch-only', () => {
    const hdSegwit = new HDSegwitBech32Wallet();
    expect(isWatchOnlySegwitBech32(hdSegwit)).toBe(false);

    const hdTaproot = new HDTaprootWallet();
    expect(isWatchOnlySegwitBech32(hdTaproot)).toBe(false);

    const legacy = new LegacyWallet();
    expect(isWatchOnlySegwitBech32(legacy)).toBe(false);
  });

  test('returns false when HD wallet instance is missing', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('bc1qatswv5uv7qetzz4n8u9u2x2ckmaxvc8qng5s7r');
    w.init();
    expect(isWatchOnlySegwitBech32(w)).toBe(false);
  });

  test('returns false when HD wallet instance is not Bech32', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('xpub6Cf1vJbFa7yELW81rEgLvna3FJep5Ubryz7pX1E8LEVvcKWz6goRqjZPiUt2jU95DQ4ic46AvniS3Rf4VCs7QkLz2rzs4ZVMF4nWmPk3Rhg)');
    w.init();

    expect(isWatchOnlySegwitBech32(w)).toBe(false);
  });
});
