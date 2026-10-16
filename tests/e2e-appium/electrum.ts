import net from 'net';
import { createHash } from 'crypto';
import { address, Transaction } from 'bitcoinjs-lib';

// Public BIP84 test vector. Coins exist only in this local Electrum fixture.
export const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const ADDRESS = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
export const VALUES = [69909, 12000, 13000, 14000];
const script = address.toOutputScript(ADDRESS);
const toScriptHash = (output: Uint8Array) => createHash('sha256').update(output).digest().reverse().toString('hex');
const funding = new Transaction();
funding.addInput(new Uint8Array(32), 0xffffffff, 0xffffffff, Uint8Array.from([3, 1, 0, 0]));
for (const value of VALUES) funding.addOutput(script, BigInt(value));
export const FUNDING_TXID = funding.getId();
// Public BIP39 vector with used BIP44 and BIP84 accounts for normal discovery.
export const DISCOVERY_MNEMONIC = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
export const DISCOVERY_ADDRESSES = ['1EjnS13zBgN6tUgy6U64qFeh53fyAeUsqE', 'bc1qk0a9hr7wjfxeenz9nwenw9flhq0tmsf6vsgnn2'];
const discoveryFunding = new Transaction();
discoveryFunding.addInput(new Uint8Array(32), 0xffffffff, 0xffffffff, Uint8Array.from([3, 2, 0, 0]));
for (const outputAddress of DISCOVERY_ADDRESSES) discoveryFunding.addOutput(address.toOutputScript(outputAddress), 25000n);
const transactions = new Map([funding, discoveryFunding].map(tx => [tx.getId(), tx]));
const outputs = [...transactions].flatMap(([txid, tx]) =>
  tx.outs.map((output, index) => ({ txid, index, value: Number(output.value), scriptHash: toScriptHash(output.script) })),
);
const HEIGHT = 900000;
const HEADER = '00000020' + '00'.repeat(32) + '11'.repeat(32) + '00000060ffff001d00000000';

export async function startElectrum() {
  const sockets = new Set<net.Socket>();
  const requests: string[] = [];
  const reply = (request: { id: number; method: string; params?: any[] }) => {
    const { id, method, params = [] } = request;
    requests.push(method);
    const matchingOutputs = outputs.filter(output => output.scriptHash === params[0]);
    let result: unknown;
    switch (method) {
      case 'server.version':
        result = ['ElectrumX E2E', '1.4'];
        break;
      case 'server.ping':
        result = null;
        break;
      case 'server.banner':
        result = 'BlueWallet local E2E fixture';
        break;
      case 'server.features':
        result = {
          genesis_hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
          protocol_min: '1.4',
          protocol_max: '1.4',
          server_version: 'ElectrumX E2E',
          hash_function: 'sha256',
        };
        break;
      case 'server.peers.subscribe':
        result = [];
        break;
      case 'blockchain.headers.subscribe':
        result = { height: HEIGHT, hex: HEADER };
        break;
      case 'blockchain.block.header':
        result = HEADER;
        break;
      case 'blockchain.estimatefee':
        result = 0.00002;
        break;
      case 'blockchain.relayfee':
        result = 0.00001;
        break;
      case 'mempool.get_fee_histogram':
        result = [[2, 1000000]];
        break;
      case 'blockchain.scripthash.subscribe':
        result = matchingOutputs.length ? matchingOutputs[0].txid : null;
        break;
      case 'blockchain.scripthash.get_balance':
        result = { confirmed: matchingOutputs.reduce((sum, output) => sum + output.value, 0), unconfirmed: 0 };
        break;
      case 'blockchain.scripthash.get_history':
        result = [...new Set(matchingOutputs.map(output => output.txid))].map(tx_hash => ({ tx_hash, height: HEIGHT - 100 }));
        break;
      case 'blockchain.scripthash.get_mempool':
        result = [];
        break;
      case 'blockchain.scripthash.listunspent':
        result = matchingOutputs.map(({ txid, index, value }) => ({ tx_hash: txid, tx_pos: index, height: HEIGHT - 100, value }));
        break;
      case 'blockchain.transaction.get': {
        const tx = transactions.get(params[0]);
        if (!tx) return { id, error: { code: -5, message: 'No such fixture transaction' } };
        result = params[1]
          ? {
              txid: tx.getId(),
              hash: tx.getId(),
              hex: tx.toHex(),
              version: tx.version,
              size: tx.byteLength(),
              vsize: tx.virtualSize(),
              weight: tx.weight(),
              locktime: 0,
              vin: [{ coinbase: Buffer.from(tx.ins[0].script).toString('hex'), sequence: 0xffffffff }],
              vout: tx.outs.map((output, n) => ({
                value: Number(output.value) / 1e8,
                n,
                scriptPubKey: {
                  asm: '',
                  hex: Buffer.from(output.script).toString('hex'),
                  type: output.script.length === 22 ? 'witness_v0_keyhash' : 'pubkeyhash',
                  addresses: [address.fromOutputScript(output.script)],
                  address: address.fromOutputScript(output.script),
                },
              })),
              confirmations: 101,
              blockhash: '22'.repeat(32),
              time: 1700000000,
              blocktime: 1700000000,
            }
          : tx.toHex();
        break;
      }
      // Fail closed: no test can publish a transaction to any network through this server.
      case 'blockchain.transaction.broadcast':
        return { id, error: { code: -1, message: 'Broadcast is disabled in E2E' } };
      default:
        return { id, error: { code: -32601, message: `Unsupported fixture method: ${method}` } };
    }
    return { id, jsonrpc: '2.0', result };
  };
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
    let pending = '';
    socket.on('data', data => {
      pending += data.toString();
      let end: number;
      while ((end = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 1);
        try {
          const request = JSON.parse(line);
          socket.write(JSON.stringify(Array.isArray(request) ? request.map(reply) : reply(request)) + '\n');
        } catch {
          socket.destroy();
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    port: (server.address() as net.AddressInfo).port,
    requests,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    },
  };
}
