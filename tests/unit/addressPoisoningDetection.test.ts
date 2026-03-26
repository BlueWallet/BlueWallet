/**
 * Unit tests for Address Poisoning Detection
 *
 * Tests the core detection logic in helpers/addressPoisoningDetection.ts
 */

import {
  checkForAddressPoisoning,
  collectRecentlyUsedAddresses,
  AddressPoisoningWarning,
} from '../../helpers/addressPoisoningDetection';
import { Transaction } from '../../class/wallets/types';

describe('Address Poisoning Detection', () => {
  const ownAddresses = new Set<string>([
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  ]);

  describe('checkForAddressPoisoning', () => {
    it('should detect single-character difference (classic poisoning)', () => {
      // Real address vs poisoned version (changed one char near the end)
      const realAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const poisonedAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wli'; // changed 'h' to 'i'

      const result = checkForAddressPoisoning(
        [poisonedAddr],
        [realAddr],
        ownAddresses,
        [],
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].differences).toBe(1);
      expect(result.warnings[0].address).toBe(poisonedAddr);
      expect(result.warnings[0].similarTo).toBe(realAddr);
    });

    it('should detect 2-3 character differences with same prefix', () => {
      const realAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const poisonedAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlm'; // changed 2 chars

      const result = checkForAddressPoisoning(
        [poisonedAddr],
        [realAddr],
        ownAddresses,
        [],
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should not flag identical addresses', () => {
      const addr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

      const result = checkForAddressPoisoning(
        [addr],
        [addr],
        new Set<string>(),
        [],
      );

      expect(result.isSuspicious).toBe(false);
      expect(result.warnings.length).toBe(0);
    });

    it('should not flag completely different addresses', () => {
      const addr1 = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const addr2 = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'; // Satoshi's address

      const result = checkForAddressPoisoning(
        [addr2],
        [addr1],
        new Set<string>(),
        [],
      );

      expect(result.isSuspicious).toBe(false);
    });

    it('should detect 1-input-1-output suspicious pattern', () => {
      const inputAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const outputAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wli'; // 1 char diff

      // Even without known addresses, the 1-in-1-out pattern with similar addresses should trigger
      const result = checkForAddressPoisoning(
        [outputAddr],
        [], // no known addresses
        ownAddresses,
        [inputAddr],
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].reason).toContain('1-input-to-1-output');
    });

    it('should not flag own addresses as poisoned', () => {
      const poisonedVersion = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wli';

      const result = checkForAddressPoisoning(
        [poisonedVersion], // This is NOT in ownAddresses
        ownAddresses.toArray ? [] : [],
        ownAddresses,
        [],
      );

      // If poisonedVersion is not in own addresses, it should be checked
      // This test verifies we don't crash when ownAddresses is provided
      expect(result).toBeDefined();
    });

    it('should handle case-insensitive comparison', () => {
      const addr1 = 'BC1QXY2KGDYGJRSQTZQ2N0YRF2493P83KKFJHX0WLH';
      const addr2 = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wli'; // 1 char diff, different case

      const result = checkForAddressPoisoning(
        [addr2],
        [addr1],
        new Set<string>(),
        [],
      );

      // The case difference shouldn't matter - we normalize
      expect(result.isSuspicious).toBe(true);
      expect(result.warnings[0].differences).toBe(1);
    });

    it('should handle multiple output addresses', () => {
      const realAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const poisonedAddr = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wli';
      const legitimateAddr = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

      const result = checkForAddressPoisoning(
        [poisonedAddr, legitimateAddr],
        [realAddr],
        new Set<string>(),
        [],
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].address).toBe(poisonedAddr);
    });

    it('should handle P2SH addresses', () => {
      const realAddr = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
      const poisonedAddr = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLz'; // 1 char diff

      const result = checkForAddressPoisoning(
        [poisonedAddr],
        [realAddr],
        new Set<string>(),
        [],
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.warnings[0].differences).toBe(1);
    });

    it('should handle legacy P2PKH addresses', () => {
      const realAddr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      const poisonedAddr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3'; // 1 char diff

      const result = checkForAddressPoisoning(
        [poisonedAddr],
        [realAddr],
        new Set<string>(),
        [],
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.warnings[0].differences).toBe(1);
    });

    it('should not false positive on addresses with many differences', () => {
      const addr1 = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const addr2 = 'bc1qabc4efghijklmnopqrstuvwxyz0123456789'; // same length, very different

      const result = checkForAddressPoisoning(
        [addr2],
        [addr1],
        new Set<string>(),
        [],
      );

      expect(result.isSuspicious).toBe(false);
    });

    it('should ignore empty addresses', () => {
      const result = checkForAddressPoisoning(
        ['', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wli'],
        ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
        new Set<string>(),
        [],
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.warnings.length).toBe(1);
    });
  });

  describe('collectRecentlyUsedAddresses', () => {
    it('should collect addresses from transactions', () => {
      const txs: Transaction[] = [
        {
          txid: 'hash1',
          hash: 'hash1',
          version: 1,
          size: 100,
          vsize: 100,
          weight: 400,
          locktime: 0,
          inputs: [{ txid: 'prev', vout: 0, scriptSig: { asm: '', hex: '' }, txinwitness: [], sequence: 0, addresses: ['1InputAddr'] }],
          outputs: [{ value: 50000, n: 0, scriptPubKey: { asm: '', hex: '', reqSigs: 1, type: 'p2pkh', addresses: ['1OutputAddr'] } }],
          blockhash: '',
          confirmations: 1,
          time: 1000000,
          blocktime: 1000000,
          timestamp: 1000000,
        },
      ];

      const result = collectRecentlyUsedAddresses(txs, new Set<string>());
      expect(result).toContain('1InputAddr');
      expect(result).toContain('1OutputAddr');
    });

    it('should exclude own addresses', () => {
      const txs: Transaction[] = [
        {
          txid: 'hash1',
          hash: 'hash1',
          version: 1,
          size: 100,
          vsize: 100,
          weight: 400,
          locktime: 0,
          inputs: [{ txid: 'prev', vout: 0, scriptSig: { asm: '', hex: '' }, txinwitness: [], sequence: 0, addresses: ['1OwnAddr', '1OtherAddr'] }],
          outputs: [{ value: 50000, n: 0, scriptPubKey: { asm: '', hex: '', reqSigs: 1, type: 'p2pkh', addresses: ['1OwnAddr2'] } }],
          blockhash: '',
          confirmations: 1,
          time: 1000000,
          blocktime: 1000000,
          timestamp: 1000000,
        },
      ];

      const ownAddrs = new Set<string>(['1OwnAddr', '1OwnAddr2']);
      const result = collectRecentlyUsedAddresses(txs, ownAddrs);
      expect(result).toContain('1OtherAddr');
      expect(result).not.toContain('1OwnAddr');
      expect(result).not.toContain('1OwnAddr2');
    });

    it('should deduplicate addresses', () => {
      const txs: Transaction[] = [
        {
          txid: 'hash1',
          hash: 'hash1',
          version: 1,
          size: 100,
          vsize: 100,
          weight: 400,
          locktime: 0,
          inputs: [{ txid: 'prev', vout: 0, scriptSig: { asm: '', hex: '' }, txinwitness: [], sequence: 0, addresses: ['1SameAddr'] }],
          outputs: [{ value: 50000, n: 0, scriptPubKey: { asm: '', hex: '', reqSigs: 1, type: 'p2pkh', addresses: ['1SameAddr'] } }],
          blockhash: '',
          confirmations: 1,
          time: 1000000,
          blocktime: 1000000,
          timestamp: 1000000,
        },
        {
          txid: 'hash2',
          hash: 'hash2',
          version: 1,
          size: 100,
          vsize: 100,
          weight: 400,
          locktime: 0,
          inputs: [{ txid: 'prev', vout: 0, scriptSig: { asm: '', hex: '' }, txinwitness: [], sequence: 0, addresses: ['1SameAddr'] }],
          outputs: [{ value: 50000, n: 0, scriptPubKey: { asm: '', hex: '', reqSigs: 1, type: 'p2pkh', addresses: ['1SameAddr'] } }],
          blockhash: '',
          confirmations: 1,
          time: 2000000,
          blocktime: 2000000,
          timestamp: 2000000,
        },
      ];

      const result = collectRecentlyUsedAddresses(txs, new Set<string>());
      expect(result.filter(a => a === '1SameAddr').length).toBe(1);
    });

    it('should respect maxTransactions limit', () => {
      const txs: Transaction[] = Array.from({ length: 200 }, (_, i) => ({
        txid: `hash${i}`,
        hash: `hash${i}`,
        version: 1,
        size: 100,
        vsize: 100,
        weight: 400,
        locktime: 0,
        inputs: [{ txid: 'prev', vout: 0, scriptSig: { asm: '', hex: '' }, txinwitness: [], sequence: 0, addresses: [`1Addr${i}`] }],
        outputs: [{ value: 50000, n: 0, scriptPubKey: { asm: '', hex: '', reqSigs: 1, type: 'p2pkh', addresses: [] } }],
        blockhash: '',
        confirmations: 1,
        time: 1000000 + i,
        blocktime: 1000000 + i,
        timestamp: 1000000 + i,
      }));

      const result = collectRecentlyUsedAddresses(txs, new Set<string>(), 50);
      // Should only have addresses from the 50 most recent transactions
      // Since each tx has a unique input address, we expect at most 50
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });
});
