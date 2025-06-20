import { describe, it, expect } from '@jest/globals';
import LinkingConfig from '../../navigation/LinkingConfig';

describe('LinkingConfig', () => {
  describe('getStateFromPath', () => {
    // Create a minimal config object that satisfies the TypeScript requirements
    const mockConfig = {
      screens: {},
    };

    it('should handle bitcoin URIs correctly', () => {
      const path = 'bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('SendDetailsRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('SendDetails');
      expect(params?.params?.uri).toBe('bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo');
    });

    it('should handle bitcoin URIs with double slashes correctly', () => {
      const path = 'bitcoin://bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('SendDetailsRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('SendDetails');
      expect(params?.params?.uri).toBe('bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo');
    });

    it('should handle bluewallet bitcoin URIs correctly', () => {
      const path = 'bluewallet://bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('SendDetailsRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('SendDetails');
      expect(params?.params?.uri).toBe('bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo');
    });

    it('should handle case-insensitive BITCOIN URIs', () => {
      const path = 'BITCOIN:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('SendDetailsRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('SendDetails');
      expect(params?.params?.uri).toBe('BITCOIN:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo');
    });

    it('should return undefined for non-bitcoin and non-lightning URIs', () => {
      const path = 'bluewallet:something-else';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeUndefined();
    });

    // Lightning tests
    it('should handle lightning URIs correctly', () => {
      const path = 'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('ScanLNDInvoiceRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('ScanLNDInvoice');
      expect(params?.params?.uri).toBe(
        'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq',
      );
    });

    it('should handle lightning URIs with double slashes correctly', () => {
      const path = 'lightning://lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('ScanLNDInvoiceRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('ScanLNDInvoice');
      expect(params?.params?.uri).toBe(
        'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq',
      );
    });

    it('should handle bluewallet lightning URIs correctly', () => {
      const path =
        'bluewallet://lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('ScanLNDInvoiceRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('ScanLNDInvoice');
      expect(params?.params?.uri).toBe(
        'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq',
      );
    });

    it('should handle bluewallet lightning URIs with double slashes correctly', () => {
      const path =
        'bluewallet://lightning://lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('ScanLNDInvoiceRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('ScanLNDInvoice');
      // The double slash version is normalized to a single-slash version
      expect(params?.params?.uri).toContain('lightning:');
      expect(params?.params?.uri).toContain(
        'lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq',
      );
    });

    it('should handle bluewallet:bitcoin URIs with single colon correctly', () => {
      const path = 'bluewallet:bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('SendDetailsRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('SendDetails');
      expect(params?.params?.uri).toBe('bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo');
    });

    it('should handle bluewallet:lightning URIs with single colon correctly', () => {
      const path =
        'bluewallet:lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq';
      const state = LinkingConfig.getStateFromPath?.(path, mockConfig);

      expect(state).toBeDefined();
      if (!state) return; // TypeScript null check

      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('ScanLNDInvoiceRoot');

      const params = state.routes[0].params as { screen: string; params: { uri: string } } | undefined;
      expect(params?.screen).toBe('ScanLNDInvoice');
      expect(params?.params?.uri).toBe(
        'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuq',
      );
    });
  });

  describe('Config structure', () => {
    it('should have the expected configuration structure', () => {
      expect(LinkingConfig.config).toBeDefined();
      if (!LinkingConfig.config) return; // TypeScript null check

      expect(LinkingConfig.config.screens).toBeDefined();
      expect(LinkingConfig.config.screens.SendDetailsRoot).toBeDefined();
      expect(LinkingConfig.config.screens.DrawerRoot).toBe('*');

      // Test the prefixes
      expect(LinkingConfig.prefixes).toContain('bitcoin:');
      expect(LinkingConfig.prefixes).toContain('bitcoin://');
      expect(LinkingConfig.prefixes).toContain('BITCOIN:');
      expect(LinkingConfig.prefixes).toContain('bluewallet://bitcoin:');
    });
  });

  /*
   * We'll add proper tests for the LinkingUtils in a separate PR
   * This will require proper mocking of RNQRGenerator and Linking
   */
});
