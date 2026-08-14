import { HDSegwitBech32Wallet } from "../class/wallets/hd-segwit-bech32-wallet";
import { TWallet } from "../class/wallets/types";
import { WatchOnlyWallet } from "../class/wallets/watch-only-wallet";

export function isWatchOnlySegwitBech32(
  wallet: TWallet,
): wallet is WatchOnlyWallet & {
  _hdWalletInstance: HDSegwitBech32Wallet;
} {
  return (
    wallet.type === WatchOnlyWallet.type &&
    wallet._hdWalletInstance?.type === HDSegwitBech32Wallet.type
  );
}
