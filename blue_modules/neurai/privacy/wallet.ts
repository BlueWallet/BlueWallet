/**
 * What the C6/C7 pools need from a transparent wallet: whether it can be used,
 * a read/admission RPC through the wallet's own service, and local signing of
 * the transparent inputs the pool transaction spends.
 */

import { sign, type SignHashType } from '@neuraiproject/neurai-sign-transaction';
import type { NzkFamily } from '@neuraiproject/neurai-privacy';

import type { AbstractNeuraiWallet } from '../../../class/wallets/abstract-neurai-wallet';
import { signerNetworkFor } from '../keyNetwork';
import { isTestnetChain } from '../networkConfig';

export type PoolRpc = (method: string, params?: unknown[]) => Promise<any>;

/**
 * The wallet surface the pool uses. Structural on purpose: the concrete wallet
 * classes narrow `type` to their own literal, so they are not assignable to
 * `AbstractNeuraiWallet` itself.
 */
export type PrivacyWallet = Pick<
  AbstractNeuraiWallet,
  | 'getID'
  | 'secret'
  | 'passphrase'
  | 'network'
  | 'getEngineNetwork'
  | 'getBackend'
  | 'getSigningKey'
  | 'walletKind'
  | 'getStaticReceiveAddress'
  | 'getChangeAddressAsync'
  | 'listOwnAddresses'
  | 'listOwnUtxos'
  | 'getBaseCurrencyName'
  | 'buildSendTransaction'
  | 'notePrivacyPoolBalance'
>;

/** C6 needs an RPC reply within this time; pending reservations survive a timeout. */
const RPC_TIMEOUT_MS = 45_000;

/**
 * Private-wallet family of a supported wallet: Legacy P2PKH, strict ECDSA v3
 * or strict PQ v2, the address types C6 accepts for funding and withdrawals
 * (as in the web wallet, generic AuthScript v1 addresses are for contracts,
 * not wallets).
 */
export function c6Family(wallet: PrivacyWallet): NzkFamily | null {
  if (!wallet.secret || !isTestnetChain(wallet.network)) return null;
  const engine = wallet.getEngineNetwork();
  if (engine === 'xna-test') return 'legacy';
  if (engine === 'xna-ecdsa-test') return 'ecdsa';
  if (engine === 'xna-pq-strict-test') return 'pq';
  return null;
}

/** Why the privacy pool (C6 or C7) cannot be opened for this wallet, or null when it can. */
export function c6BlockedReason(wallet: PrivacyWallet | undefined): string | null {
  if (!wallet) return 'Open a testnet wallet first.';
  if (!isTestnetChain(wallet.network)) return 'The privacy pool is testnet only. Switch to a testnet wallet to use it.';
  if (!wallet.secret)
    return 'This wallet has no recovery words on this device (hardware or watch-only), so it cannot open a private wallet.';
  if (!c6Family(wallet)) return 'This wallet type cannot use the privacy pool.';
  return null;
}

/**
 * Node RPC through the wallet's WSS service (`rpc.call` / `tx.broadcast`).
 * As in the library's wallet-service adapter, a negative node error code is
 * exposed as `Error.code` so publication recovery can tell a node rejection
 * from a transport failure.
 */
export function createPrivacyRpc(wallet: PrivacyWallet): PoolRpc {
  return async (method, params = []) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        wallet.getBackend().rpc(method, params),
        new Promise((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error(`RPC timeout (${method}); pending operations remain reserved`)), RPC_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      const details = (error as { details?: { node_code?: unknown } })?.details;
      const nodeCode = details?.node_code;
      if (error instanceof Error && Number.isInteger(nodeCode) && (nodeCode as number) < 0) {
        (error as Error & { code?: number }).code = nodeCode as number;
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

/**
 * Where the exact funding coin goes (`to`) and where the funding transaction's
 * change goes. The wallet pays itself, so the two must differ: the transaction
 * builder refuses a change address equal to a recipient. A PQ wallet that
 * reuses its address keeps the change there, as a regular send does, and the
 * coin waits on another own address until the deposit spends it. `to` is
 * missing only if the wallet has no other address.
 */
export async function c6FundingAddresses(wallet: PrivacyWallet, reusePQAddress: boolean): Promise<{ to?: string; change: string }> {
  const change =
    reusePQAddress && wallet.walletKind === 'pq' ? await wallet.getStaticReceiveAddress() : await wallet.getChangeAddressAsync();
  const to = (await wallet.listOwnAddresses()).find(address => address !== change);
  return { to, change };
}

export interface PoolInputCoin {
  address: string;
  assetName: string;
  txid: string;
  outputIndex: number;
  script: string;
  satoshis: string;
  value: string;
}

/**
 * Sign only the given inputs of a pool transaction with the wallet's keys
 * (`inputHashTypes`: index → SIGHASH_ALL (1) or SINGLE|ANYONECANPAY (131)).
 * The key never leaves this call.
 */
export async function signPoolInputs(
  wallet: PrivacyWallet,
  raw: string,
  coins: PoolInputCoin[],
  inputHashTypes: Record<number, SignHashType>,
): Promise<string> {
  const keys: Record<string, Parameters<typeof sign>[3][string]> = {};
  try {
    for (const coin of coins) {
      const key = await wallet.getSigningKey(coin.address);
      if (!key) throw new Error('This wallet does not own ' + coin.address);
      keys[coin.address] = key as Parameters<typeof sign>[3][string];
    }
    return sign(signerNetworkFor(wallet.getEngineNetwork()), raw, coins, keys, { debug: false, inputHashTypes });
  } finally {
    for (const address of Object.keys(keys)) delete keys[address];
  }
}
