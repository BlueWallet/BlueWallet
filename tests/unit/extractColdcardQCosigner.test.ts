import { MultisigHDWallet } from '../../class';
import { extractColdcardQCosigner } from '../../util/extractColdcardQCosigner';

const coldcard = require('./fixtures/coldcardQ.json');

describe('extractColdcardQCosigner', () => {
  it('can extract P2SH-P2WSH cosigner (bip48_1)', () => {
    const result = extractColdcardQCosigner(coldcard, MultisigHDWallet.FORMAT_P2SH_P2WSH);
    expect(result).toEqual({
      xfp: 'B68AF6E4',
      path: '/48h/0h/0h/1h',
      xpub: 'xpub6ENXu6jP3XgX9QDKy3eSUDpuskB3UahgifC5jtTzE9zeg4uhMjmSwep6rZBkhTsTgJ4r64YEpdKd311YBFQos7H55Sio5k9GEgRXBhYNZvm',
    });
  });

  it('can extract P2WSH cosigner (bip48_2)', () => {
    const result = extractColdcardQCosigner(coldcard, MultisigHDWallet.FORMAT_P2WSH);
    expect(result).toEqual({
      xfp: 'B68AF6E4',
      path: '/48h/0h/0h/2h',
      xpub: 'xpub6ENXu6jP3XgXCMgRq1Pb1bNXKjRZ7JnM8R17W8dH6GSmM4VokYExQX8mtSwnjqyxJ8qNdrT1Us8jNwz8Y9mvBkmLhzTzwKKYEtZFMszFScb',
    });
  });

  it('can extract P2SH cosigner (bip45)', () => {
    const result = extractColdcardQCosigner(coldcard, MultisigHDWallet.FORMAT_P2SH);
    expect(result).toEqual({
      xfp: 'B68AF6E4',
      path: '/45h',
      xpub: 'xpub69EKPNo9Jkd6v2h7xNKw5RdbFBoaHEcstXcRNfcQ2jg71iFpobCwcxfJjaV2ycGy218f2jM1znqs1SDkqMiR7fbyBVJwzacg2QarGt1gtJg',
    });
  });

  it('should return undefined if colcard json data is missing', () => {
    expect(extractColdcardQCosigner(null, MultisigHDWallet.FORMAT_P2SH_P2WSH)).toBeUndefined();
  });

  it('should return undefined if chain is not BTC', () => {
    const invalidChain = { ...coldcard, chain: 'TBTC' };
    expect(extractColdcardQCosigner(invalidChain, MultisigHDWallet.FORMAT_P2SH_P2WSH)).toBeUndefined();
  });

  it('should return undefined if multisig wallet format is invalid', () => {
    const result = extractColdcardQCosigner(coldcard, 'unknown_format');
    expect(result).toBeUndefined();
  });
});
