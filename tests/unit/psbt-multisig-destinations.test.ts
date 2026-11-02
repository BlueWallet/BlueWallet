import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { getDestinationData } from '../../screen/send/psbtMultisig';

const seeds = [
  'certain cruise forum ladder reveal frame company book sausage flat wasp mouse',
  'sting tumble brave remember sadness embrace increase under year joke drum skate',
  'daughter parade neck suit brick wife horror inquiry leopard exhibit body mobile',
];
const external = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const makeWallet = () => {
  const w = new MultisigHDWallet();
  w.setSecret(
    '# BlueWallet Multisig setup file\n' +
      'Policy: 2 of 3\n' +
      "Derivation: m/48'/0'/0'/2'\n" +
      'Format: P2WSH\n' +
      '\n' +
      seeds.map(seed => `seed: ${seed}\n`).join('\n'),
  );
  return w;
};

const psbtPaying = (outputs: { address: string; value: number }[]) => {
  const psbt = new bitcoin.Psbt();
  for (const { address, value } of outputs) psbt.addOutput({ address, value: BigInt(value) });
  return psbt;
};

describe('psbtMultisig getDestinationData', () => {
  const w = makeWallet();
  const receive = w._getExternalAddressByIndex(0);
  const change = w._getInternalAddressByIndex(0);

  it('hides change but keeps a payment to our own receive address', () => {
    const psbt = psbtPaying([
      { address: external, value: 1000 },
      { address: receive, value: 2000 },
      { address: change, value: 5000 },
    ]);

    const { addresses, totalSat, targets } = getDestinationData(psbt, w);

    assert.deepStrictEqual(addresses, [external, receive]);
    assert.strictEqual(totalSat, 3000);
    assert.deepStrictEqual(targets, [
      { address: external, value: 1000 },
      { address: receive, value: 2000 },
    ]);
  });

  it('shows a self-send to our own receive address as the recipient', () => {
    const psbt = psbtPaying([
      { address: receive, value: 2000 },
      { address: change, value: 5000 },
    ]);

    const { addresses, totalSat } = getDestinationData(psbt, w);

    assert.deepStrictEqual(addresses, [receive]);
    assert.strictEqual(totalSat, 2000);
  });

  it('includes change when asked to', () => {
    const psbt = psbtPaying([
      { address: external, value: 1000 },
      { address: change, value: 5000 },
    ]);

    const { addresses, totalSat } = getDestinationData(psbt, w, false);

    assert.deepStrictEqual(addresses, [external, change]);
    assert.strictEqual(totalSat, 6000);
  });
});
