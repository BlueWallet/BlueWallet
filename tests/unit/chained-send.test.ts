/**
 * H17 · Two-step silent payments: both signed transactions are saved in the
 * wallet before the first one is sent, so a closed app, a dead process or a
 * lost answer never leaves the recipient unpaid without the user knowing.
 */
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import {
  ChainedSendClosedError,
  ChainedSendNotSavedError,
  chainedSendState,
  finishChainedSend,
  isAlreadyKnown,
  isPermanentRejection,
  normalizeChainedSends,
  sendChainedPayment,
  type ChainedSend,
  type ChainedSendWallet,
} from '../../blue_modules/neurai/chainedSends';
import { appOn, StorageDouble } from './helpers/storage-double';

const WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const restore = (json: string) => NeuraiHDWallet.fromJson(json) as unknown as NeuraiHDWallet;

const SEND: ChainedSend = {
  firstTxid: 'a'.repeat(64),
  first: '01aa',
  secondTxid: 'b'.repeat(64),
  second: '02bb',
  bridge: 'NbridgeAddress',
  to: 'sp1qcode',
  amountSats: '150000000',
  createdAt: 1_795_000_000,
};

/** A wallet whose broadcasts answer as told, recording every step. */
function fakeWallet(answers: Record<string, Array<'ok' | Error>> = {}) {
  const steps: string[] = [];
  const sends = new Map<string, ChainedSend>();
  const wallet: ChainedSendWallet & { sends: Map<string, ChainedSend> } = {
    sends,
    recordChainedSend: send => {
      sends.set(send.firstTxid, send);
      steps.push('record');
    },
    forgetChainedSend: firstTxid => {
      sends.delete(firstTxid);
      steps.push('forget');
    },
    broadcastTx: async hex => {
      steps.push(`broadcast:${hex}`);
      const answer = (answers[hex] ?? []).shift() ?? 'ok';
      if (answer instanceof Error) throw answer;
      return hex === SEND.first ? SEND.firstTxid : SEND.secondTxid;
    },
    addPendingTx: txid => steps.push(`pending:${txid.slice(0, 4)}`),
  };
  return { wallet, steps };
}
const saving =
  (steps: string[], fail = false) =>
  async () => {
    steps.push('save');
    if (fail) throw new Error('keystore full');
  };

describe('H17 · node answers', () => {
  it('tells an already known transaction from a refusal and from no answer', () => {
    for (const reason of ['txn-already-in-mempool', 'transaction already in block chain', 'txn-already-known']) {
      expect(isAlreadyKnown(reason)).toBe(true);
    }
    for (const reason of ['bad-txns-inputs-missingorspent', 'txn-mempool-conflict', 'min relay fee not met', 'insufficient fee']) {
      expect(isPermanentRejection(reason)).toBe(true);
      expect(isAlreadyKnown(reason)).toBe(false);
    }
    for (const reason of ['WSS connection closed', 'Network request failed', 'timeout']) {
      expect(isPermanentRejection(reason)).toBe(false);
    }
  });

  it('reads what the bridge address shows', () => {
    expect(chainedSendState(SEND, new Set([SEND.firstTxid, SEND.secondTxid]))).toBe('done');
    expect(chainedSendState(SEND, new Set([SEND.firstTxid]))).toBe('first-seen');
    expect(chainedSendState(SEND, new Set())).toBe('not-seen');
  });

  it('keeps only well-formed records from storage', () => {
    expect(normalizeChainedSends(undefined)).toEqual([]);
    expect(normalizeChainedSends('x')).toEqual([]);
    expect(normalizeChainedSends([SEND, { firstTxid: 'x' }, null])).toEqual([SEND]);
  });
});

describe('H17 · sending', () => {
  it('saves both transactions before sending the first, then forgets them once the second is accepted', async () => {
    const { wallet, steps } = fakeWallet();
    expect(await sendChainedPayment(wallet, SEND, 150_010_000n, saving(steps))).toBe(SEND.secondTxid);
    expect(steps).toEqual(['record', 'save', `broadcast:${SEND.first}`, 'pending:aaaa', `broadcast:${SEND.second}`, 'forget', 'save']);
    expect(wallet.sends.size).toBe(0);
  });

  it('sends nothing when the record cannot be saved', async () => {
    const { wallet, steps } = fakeWallet();
    await expect(sendChainedPayment(wallet, SEND, 1n, saving(steps, true))).rejects.toBeInstanceOf(ChainedSendNotSavedError);
    expect(steps.filter(step => step.startsWith('broadcast'))).toEqual([]);
    expect(wallet.sends.size).toBe(0);
  });

  it('a first transaction refused for good closes the payment; nothing left the wallet', async () => {
    const { wallet, steps } = fakeWallet({ [SEND.first]: [new Error('bad-txns-inputs-missingorspent')] });
    const error = await sendChainedPayment(wallet, SEND, 1n, saving(steps)).catch(e => e);
    expect(error).toBeInstanceOf(ChainedSendClosedError);
    expect((error as ChainedSendClosedError).leg).toBe('first');
    expect(steps).not.toContain(`broadcast:${SEND.second}`);
    expect(wallet.sends.size).toBe(0);
  });

  it('a lost answer keeps the record; finishing later counts "already known" as sent', async () => {
    const { wallet, steps } = fakeWallet({ [SEND.first]: [new Error('WSS connection closed'), new Error('txn-already-in-mempool')] });
    await expect(sendChainedPayment(wallet, SEND, 1n, saving(steps))).rejects.toThrow('WSS connection closed');
    expect(wallet.sends.has(SEND.firstTxid)).toBe(true);

    expect(await finishChainedSend(wallet, SEND, saving(steps), true)).toBe(SEND.secondTxid);
    expect(wallet.sends.size).toBe(0);
    expect(steps.filter(step => step === `broadcast:${SEND.second}`)).toHaveLength(1);
  });

  it('a second transaction without answer stays pending; one refused for good is closed', async () => {
    const pending = fakeWallet({ [SEND.second]: [new Error('Network request failed')] });
    await expect(sendChainedPayment(pending.wallet, SEND, 1n, saving(pending.steps))).rejects.toThrow('Network request failed');
    expect(pending.wallet.sends.has(SEND.firstTxid)).toBe(true);

    const refused = fakeWallet({ [SEND.second]: [new Error('txn-mempool-conflict')] });
    const error = await sendChainedPayment(refused.wallet, SEND, 1n, saving(refused.steps)).catch(e => e);
    expect(error).toBeInstanceOf(ChainedSendClosedError);
    expect((error as ChainedSendClosedError).leg).toBe('second');
    expect(refused.wallet.sends.size).toBe(0);
  });
});

describe('H17 · across a restart, with the real wallet and store', () => {
  const plainStore = (wallet: NeuraiHDWallet) =>
    JSON.stringify({ wallets: [JSON.stringify(wallet)], tx_metadata: {}, counterparty_metadata: {} });

  it('saved, then the process dies before sending: the next start finishes both transactions', async () => {
    const original = NeuraiHDWallet.forNetwork('mainnet', WORDS);
    const disk = new StorageDouble().seed({ data: plainStore(original), data_encrypted: '' });
    const app = appOn(disk);
    await app.loadFromDisk();
    const wallet = app.wallets[0] as NeuraiHDWallet;

    // The send screen records and saves; the process dies before the first broadcast.
    const broadcastBeforeCrash = jest.spyOn(wallet, 'broadcastTx');
    wallet.recordChainedSend(SEND);
    await app.saveToDisk();
    expect(broadcastBeforeCrash).not.toHaveBeenCalled();

    const restarted = appOn(disk);
    await restarted.loadFromDisk();
    const reloaded = restarted.wallets[0] as NeuraiHDWallet;
    expect(reloaded.getChainedSends()).toEqual([SEND]);

    const sent: string[] = [];
    jest.spyOn(reloaded, 'broadcastTx').mockImplementation(async hex => {
      sent.push(hex);
      return hex === SEND.first ? SEND.firstTxid : SEND.secondTxid;
    });
    await finishChainedSend(reloaded, SEND, () => restarted.saveToDisk(), true);
    expect(sent).toEqual([SEND.first, SEND.second]);
    expect(reloaded.getChainedSends()).toEqual([]);

    const third = appOn(disk);
    await third.loadFromDisk();
    expect((third.wallets[0] as NeuraiHDWallet).getChainedSends()).toEqual([]);
  });

  it('forgets a payment the bridge address shows complete, and keeps one half done', async () => {
    const wallet = NeuraiHDWallet.forNetwork('mainnet', WORDS);
    const other: ChainedSend = { ...SEND, firstTxid: 'c'.repeat(64), secondTxid: 'd'.repeat(64), bridge: 'NotherBridge' };
    wallet.recordChainedSend(SEND);
    wallet.recordChainedSend(other);
    const backend = {
      getAddressHistory: async ([address]: string[]) =>
        address === SEND.bridge ? [{ txid: SEND.firstTxid }, { txid: SEND.secondTxid }] : [{ txid: other.firstTxid }],
      getMempool: async () => [],
    };
    jest.spyOn(wallet, 'getBackend').mockReturnValue(backend as never);

    expect(await wallet.reconcileChainedSends()).toBe(true);
    expect(wallet.getChainedSends()).toEqual([other]);
    expect((await wallet.chainedSendStates()).get(other.firstTxid)).toBe('first-seen');
  });

  it('a wallet saved before this change loads with no records, and malformed ones are dropped', () => {
    const wallet = NeuraiHDWallet.forNetwork('mainnet', WORDS);
    const before = JSON.parse(JSON.stringify(wallet));
    delete before._chainedSends;
    expect(restore(JSON.stringify(before)).getChainedSends()).toEqual([]);
    expect(restore(JSON.stringify({ ...before, _chainedSends: [{ nope: 1 }] })).getChainedSends()).toEqual([]);
  });

  it('a testnet reset drops the records of the old chain', () => {
    const wallet = NeuraiHDWallet.forNetwork('testnet', WORDS);
    wallet.recordChainedSend(SEND);
    const stored = JSON.parse(JSON.stringify(wallet));
    stored.testnetGenesis = 'an-older-testnet';
    expect(restore(JSON.stringify(stored)).getChainedSends()).toEqual([]);
  });
});

afterEach(() => jest.restoreAllMocks());
