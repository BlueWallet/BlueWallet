import { HDLegacyElectrumSeedP2PKHWallet } from '../../class';

describe('HDLegacyElectrumSeedP2PKHWallet', () => {
  it('wont accept BIP39 seed', () => {
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret(
      'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode',
    );
    expect(!hd.validateMnemonic()).toBeTruthy();
  });

  it('wont accept electrum seed, but SEGWIT seed', () => {
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret('method goddess  humble  crumble output snake essay carpet monster barely trip betray ');
    expect(!hd.validateMnemonic()).toBeTruthy();
  });

  it('can import mnemonics and generate addresses and WIFs', async function () {
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret('receive happy  wash prosper update    pet neck acid try profit proud hungry  ');
    expect(hd.validateMnemonic()).toBeTruthy();
    expect(hd.getXpub()).toBe(
      'xpub661MyMwAqRbcG6vx5SspHUzrhRtPKyeGp41JJLBi3kgeMCFkR6mzGkhEttBHTZg6FYYij52pqD2cW7XsutiZrRukXNLqeo87mZAV5k5bC22',
    );

    let address = hd._getExternalAddressByIndex(0);
    expect(address).toBe('1Ca9ZVshGdKiiMEMNTG1bYqbifYMZMwV8');
    expect(hd.getAllExternalAddresses().includes('1Ca9ZVshGdKiiMEMNTG1bYqbifYMZMwV8')).toBeTruthy();

    address = hd._getInternalAddressByIndex(0);
    expect(address).toBe('1JygAvTQS9haAYgRfPSdHgmXd3syjB8Fnp');

    let wif = hd._getExternalWIFByIndex(0);
    expect(wif).toBe('KxGPz9dyib26p6bL2vQPvBPHBMA8iHVqEetg3x5XA4Rk1trZ11Kz');

    wif = hd._getInternalWIFByIndex(0);
    expect(wif).toBe('L52d26QmYGW8ctHo1omM5fZeJMgaonSkEWCGpnEekNvkVUoqTsNF');

    expect(hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex')).toBe(
      '02a6e6b674f82796cb4776673d824bf0673364fab24e62dcbfff4c1a5b69e3519b',
    );
    expect(hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex')).toBe(
      '0344708260d2a832fd430285a0b915859d73e6ed4c6c6a9cb73e9069a9de56fb23',
    );

    hd.setSecret('bs');
    expect(!hd.validateMnemonic()).toBeTruthy();
  });

  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'receive happy  wash prosper update    pet neck acid try profit proud hungry  ';
    const passphrase = 'super secret passphrase';
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(passphrase);

    expect(hd.getXpub()).toBe(
      'xpub661MyMwAqRbcGSUBZaVtq8qEoRkJM1TZNNvUJEgQvtiZE73gS1wKWQoTj6R2E46UDYS2SBpmGGrSHGsJUNxtr1krixFuq8JA772pG43Mo6R',
    );

    expect(hd._getExternalAddressByIndex(0)).toBe('13sPvsrgRN8XibZNHtZXNqVDJPnNZLjTap');
    expect(hd._getInternalAddressByIndex(0)).toBe('16oEuy5H7ejmapqc2AtKAYerdfkDkoyrDX');
    expect(hd._getExternalWIFByIndex(0)).toBe('Ky9WTDUTTZUKKYSPEE6uah2y5sJa89z6177kD23xh5cq1znX2HDj');
  });
});
