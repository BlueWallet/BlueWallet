import { HDSegwitBech32Wallet } from '../../class';

describe('BIP-352 Silent Payments', () => {
  it('should generate a valid silent payment address', () => {
    const wallet1 = new HDSegwitBech32Wallet();
    const wallet2 = new HDSegwitBech32Wallet();
    wallet1.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    wallet2.setSecret('zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo glue');

    const silentPaymentAddress1 = wallet1.getSilentPaymentAddress();
    const silentPaymentAddress2 = wallet2.getSilentPaymentAddress();

    expect(silentPaymentAddress1).toBe(
      'sp1qqfqnnv8czppwysafq3uwgwvsc638hc8rx3hscuddh0xa2yd746s7xqh6yy9ncjnqhqxazct0fzh98w7lpkm5fvlepqec2yy0sxlq4j6ccc3h6t0g',
    );
    expect(silentPaymentAddress2).toBe(
      'sp1qqvchcnrcqpdutxhpf57ptn3wajj0ymqxwzu9g6vj9uxx3wuvlykhyqh99hyh33y5593802pzw5rtw040zrw9f8re52tgcwngc5974w5evuufdy0m',
    );
  });
});
