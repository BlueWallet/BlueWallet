import { matchesTransactionSearch } from '../../blue_modules/transactionSearch';

it('matches all query terms across IDs and saved memos, ignoring case and whitespace', () => {
  expect(matchesTransactionSearch({ hash: 'AbCd123' }, '  abcd  RENT ', 'Monthly rent')).toBe(true);
  expect(matchesTransactionSearch({ hash: 'AbCd123' }, 'abcd groceries', 'Monthly rent')).toBe(false);
  expect(matchesTransactionSearch({}, '   ')).toBe(true);
});
it('supports Lightning and Ark identifiers without on-chain fields', () => {
  expect(matchesTransactionSearch({ payment_hash: 'payment123', description: 'Coffee' }, 'payment coffee')).toBe(true);
  expect(matchesTransactionSearch({ txid: 'ark-123' }, 'ark-123')).toBe(true);
});
it('searches addresses in transaction inputs and outputs', () => {
  const tx = {
    outputs: [{ value: 1, n: 0, scriptPubKey: { addresses: ['bc1qexample'], asm: '', hex: '', reqSigs: 1, type: 'witness_v0_keyhash' } }],
  };
  expect(matchesTransactionSearch(tx, 'bc1qexample')).toBe(true);
  expect(matchesTransactionSearch(tx, 'another-address')).toBe(false);
});
