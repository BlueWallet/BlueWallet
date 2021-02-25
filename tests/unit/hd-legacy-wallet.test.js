import { HDLegacyP2PKHWallet } from '../../class';
const assert = require('assert');
const bitcoin = require('bitcoinjs-lib');

it('Legacy HD (BIP44) works', async () => {
  if (!process.env.HD_MNEMONIC) {
    console.error('process.env.HD_MNEMONIC not set, skipped');
    return;
  }
  const hd = new HDLegacyP2PKHWallet();
  hd.setSecret(process.env.HD_MNEMONIC);
  assert.ok(hd.validateMnemonic());

  assert.strictEqual(
    hd.getXpub(),
    'xpub6ByZUAv558PPheJgcPYHpxPLwz8M7TtueYMAik84NADeQcvbzS8W3WxxJ3C9NzfYkMoChiMAumWbeEvMWhTVpH75NqGv5c9wF3wKDbfQShb',
  );

  assert.strictEqual(hd._getExternalAddressByIndex(0), '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por');
  assert.strictEqual(hd._getInternalAddressByIndex(0), '1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj');

  assert.strictEqual(hd._getInternalWIFByIndex(0), 'L4ojevRtK81A8Kof3qyLS2M7HvsVDbUDENNhJqU4vf79w9yGnQLb');
  assert.strictEqual(hd._getExternalWIFByIndex(0), 'Kz6kLhdyDfSbKuVH25XVqBRztjmFe8X22Xe1hnFzEv79gJNMkTAH');

  assert.ok(hd.getAllExternalAddresses().includes('186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por'));
  assert.ok(!hd.getAllExternalAddresses().includes('1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj')); // not internal

  assert.strictEqual(
    hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
    '0316e84a2556f30a199541633f5dda6787710ccab26771b7084f4c9e1104f47667',
  );
  assert.strictEqual(
    hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
    '02ad7b2216f3a2b38d56db8a7ee5c540fd12c4bbb7013106eff78cc2ace65aa002',
  );

  assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/84'/0'/0'/0/0"); // wrong, FIXME
  assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/84'/0'/0'/1/0"); // wrong, FIXME
});

it('Legacy HD (BIP44) can create TX', async () => {
  if (!process.env.HD_MNEMONIC) {
    console.error('process.env.HD_MNEMONIC not set, skipped');
    return;
  }
  const hd = new HDLegacyP2PKHWallet();
  hd.setSecret(process.env.HD_MNEMONIC);
  assert.ok(hd.validateMnemonic());

  const utxo = [
    {
      height: 554830,
      value: 10000,
      address: '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por',
      txId: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      vout: 0,
      txid: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      amount: 10000,
      wif: 'Kz6kLhdyDfSbKuVH25XVqBRztjmFe8X22Xe1hnFzEv79gJNMkTAH',
      confirmations: 1,
      txhex:
        '01000000000101e8d98effbb4fba4f0a89bcf217eb5a7e2f8efcae44f32ecacbc5d8cc3ce683c301000000171600148ba6d02e74c0a6e000e8b174eb2ed44e5ea211a6ffffffff0510270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac204e0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac30750000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac409c0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac204716000000000017a914e286d58e53f9247a4710e51232cce0686f16873c8702483045022100af3800cd8171f154785cf13f46c092f61c1668f97db432bb4e7ed7bc812a8c6d022051bddca1eaf1ad8b5f3bd0ccde7447e56fd3c8709e5906f02ec6326e9a5b2ff30121039a421d5eb7c9de6590ae2a471cb556b60de8c6b056beb907dbdc1f5e6092f58800000000',
    },
    {
      height: 554830,
      value: 20000,
      address: '1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj',
      txId: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      vout: 1,
      txid: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      amount: 20000,
      wif: 'L4ojevRtK81A8Kof3qyLS2M7HvsVDbUDENNhJqU4vf79w9yGnQLb',
      confirmations: 1,
      txhex:
        '01000000000101e8d98effbb4fba4f0a89bcf217eb5a7e2f8efcae44f32ecacbc5d8cc3ce683c301000000171600148ba6d02e74c0a6e000e8b174eb2ed44e5ea211a6ffffffff0510270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac204e0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac30750000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac409c0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac204716000000000017a914e286d58e53f9247a4710e51232cce0686f16873c8702483045022100af3800cd8171f154785cf13f46c092f61c1668f97db432bb4e7ed7bc812a8c6d022051bddca1eaf1ad8b5f3bd0ccde7447e56fd3c8709e5906f02ec6326e9a5b2ff30121039a421d5eb7c9de6590ae2a471cb556b60de8c6b056beb907dbdc1f5e6092f58800000000',
    },
    {
      height: 554830,
      value: 30000,
      address: '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por',
      txId: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      vout: 2,
      txid: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      amount: 30000,
      wif: 'Kz6kLhdyDfSbKuVH25XVqBRztjmFe8X22Xe1hnFzEv79gJNMkTAH',
      confirmations: 1,
      txhex:
        '01000000000101e8d98effbb4fba4f0a89bcf217eb5a7e2f8efcae44f32ecacbc5d8cc3ce683c301000000171600148ba6d02e74c0a6e000e8b174eb2ed44e5ea211a6ffffffff0510270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac204e0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac30750000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac409c0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac204716000000000017a914e286d58e53f9247a4710e51232cce0686f16873c8702483045022100af3800cd8171f154785cf13f46c092f61c1668f97db432bb4e7ed7bc812a8c6d022051bddca1eaf1ad8b5f3bd0ccde7447e56fd3c8709e5906f02ec6326e9a5b2ff30121039a421d5eb7c9de6590ae2a471cb556b60de8c6b056beb907dbdc1f5e6092f58800000000',
    },
    {
      height: 554830,
      value: 40000,
      address: '1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj',
      txId: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      vout: 3,
      txid: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      amount: 40000,
      wif: 'L4ojevRtK81A8Kof3qyLS2M7HvsVDbUDENNhJqU4vf79w9yGnQLb',
      confirmations: 1,
      txhex:
        '01000000000101e8d98effbb4fba4f0a89bcf217eb5a7e2f8efcae44f32ecacbc5d8cc3ce683c301000000171600148ba6d02e74c0a6e000e8b174eb2ed44e5ea211a6ffffffff0510270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac204e0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac30750000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac409c0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac204716000000000017a914e286d58e53f9247a4710e51232cce0686f16873c8702483045022100af3800cd8171f154785cf13f46c092f61c1668f97db432bb4e7ed7bc812a8c6d022051bddca1eaf1ad8b5f3bd0ccde7447e56fd3c8709e5906f02ec6326e9a5b2ff30121039a421d5eb7c9de6590ae2a471cb556b60de8c6b056beb907dbdc1f5e6092f58800000000',
    },
  ];

  let txNew = hd.createTransaction(
    utxo,
    [{ address: '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', value: 80000 }],
    1,
    hd._getInternalAddressByIndex(hd.next_free_change_address_index),
  );
  let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
  assert.strictEqual(tx.ins.length, 4);
  assert.strictEqual(tx.outs.length, 2);
  assert.strictEqual(tx.outs[0].value, 80000); // payee
  assert.strictEqual(tx.outs[1].value, 19330); // change
  let toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script);
  const changeAddress = bitcoin.address.fromOutputScript(tx.outs[1].script);
  assert.strictEqual('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', toAddress);
  assert.strictEqual(hd._getInternalAddressByIndex(hd.next_free_change_address_index), changeAddress);

  // testing sendMax
  txNew = hd.createTransaction(
    utxo,
    [{ address: '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK' }],
    1,
    hd._getInternalAddressByIndex(hd.next_free_change_address_index),
  );
  tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
  assert.strictEqual(tx.ins.length, 4);
  assert.strictEqual(tx.outs.length, 1);
  toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script);
  assert.strictEqual('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', toAddress);
});
