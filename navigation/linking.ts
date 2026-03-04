import DeeplinkSchemaMatch from '../class/deeplink-schema-match';

export const linking = {
  // Support lowercase/uppercase and optional double-slash variants
  prefixes: ['bitcoin:', 'BITCOIN:', 'bitcoin://', 'BITCOIN://'],

  getStateFromPath(path: string) {
    // Strip any leading slashes React Navigation might pass
    const normalized = (path || '').replace(/^\/+/, '');
    // Reconstruct a normalized bitcoin URI
    const uri = `bitcoin:${normalized}`.replace('://', ':');

    // BIP21 with embedded BOLT11: route to SelectWallet like the old flow
    try {
      const both = DeeplinkSchemaMatch.isBothBitcoinAndLightning(uri);
      if (both) {
        return {
          routes: [
            {
              name: 'SelectWallet',
              params: {
                onWalletSelect: (wallet: any, { navigation }: any) => {
                  navigation.pop();
                  navigation.navigate(...DeeplinkSchemaMatch.isBothBitcoinAndLightningOnWalletSelect(wallet, both));
                },
              },
            },
          ],
        };
      }
    } catch (_) {
      // fall through to default routing
    }

    return {
      routes: [
        {
          name: 'SendDetailsRoot',
          state: {
            routes: [
              {
                name: 'SendDetails',
                params: { uri },
              },
            ],
          },
        },
      ],
    };
  },
};

export default linking;
