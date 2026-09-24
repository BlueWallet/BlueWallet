declare function alert(message: string): void;

declare const navigator: undefined | { product: 'ReactNative' };

/** Installed by tests/setup.js; alias of describe/it for eslint-plugin-jest. */
declare const describeIfEnv: (names: string | readonly string[]) => typeof describe;
declare const itIfEnv: (names: string | readonly string[]) => typeof it;
