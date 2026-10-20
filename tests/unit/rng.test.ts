import { NativeModules } from 'react-native';

import { randomBytes } from '../../class/rng';

describe('randomBytes', () => {
  const nativeModule = NativeModules.RNGetRandomValues;

  afterEach(() => {
    jest.restoreAllMocks();
    NativeModules.RNGetRandomValues = nativeModule;
  });

  it.each([
    { useCase: 'checksum-word selection', size: 1 },
    { useCase: 'HD and Ark wallet entropy', size: 16 },
    { useCase: 'legacy-wallet private keys', size: 32 },
    { useCase: 'Realm encryption keys', size: 64 },
    { useCase: 'maximum native request', size: 65536 },
  ])('returns $size native random bytes as a plain Uint8Array for $useCase', async ({ size }) => {
    const getRandomBase64 = jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64');

    const result = await randomBytes(size);

    expect(getRandomBase64).toHaveBeenCalledTimes(1);
    expect(getRandomBase64).toHaveBeenCalledWith(size);
    expect(result).toHaveLength(size);
    expect(result.constructor).toBe(Uint8Array);
  });

  it('returns the bytes provided by the native module', async () => {
    jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockReturnValue('AQIDBA==');

    const result = await randomBytes(4);

    expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it.each([0, -1, 1.5, NaN, Infinity, 65537, Number.MAX_SAFE_INTEGER + 1])('rejects invalid size %s', async size => {
    const getRandomBase64 = jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64');

    await expect(randomBytes(size)).rejects.toThrow(`randomBytes: invalid size ${size}`);
    expect(getRandomBase64).not.toHaveBeenCalled();
  });

  it('fails clearly when the native module is unavailable', async () => {
    NativeModules.RNGetRandomValues = undefined;

    await expect(randomBytes(32)).rejects.toThrow('Secure RNG unavailable: RNGetRandomValues is not linked');
  });

  it('rejects a non-string native response', async () => {
    jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockReturnValue(undefined);

    await expect(randomBytes(32)).rejects.toThrow('Secure RNG returned a non-string value');
  });

  it.each(['not valid base64!', 'aGk', 'aGl=', 'aGk=\n', 'aGk===', 'aG!k='])(
    'rejects malformed or non-canonical base64 %j from the native module',
    async encoded => {
      jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockReturnValue(encoded);

      await expect(randomBytes(2)).rejects.toThrow();
    },
  );

  it.each([
    { encoded: 'AQI=', size: 32, length: 2 },
    { encoded: 'AQID', size: 2, length: 3 },
    { encoded: '', size: 1, length: 0 },
  ])('rejects $length decoded bytes when $size were requested', async ({ encoded, size, length }) => {
    jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockReturnValue(encoded);

    await expect(randomBytes(size)).rejects.toThrow(`Secure RNG length mismatch: expected ${size}, got ${length}`);
  });

  it('propagates native errors including Chrome remote debugging failures', async () => {
    const getRandomValues = jest.spyOn(globalThis.crypto, 'getRandomValues');
    const mathRandom = jest.spyOn(Math, 'random');
    jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockImplementation(() => {
      throw new Error('Calling synchronous methods on native modules is not supported in Chrome');
    });

    await expect(randomBytes(32)).rejects.toThrow('Calling synchronous methods on native modules is not supported in Chrome');
    expect(getRandomValues).not.toHaveBeenCalled();
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it('never routes through the insecure crypto polyfill', async () => {
    const getRandomValues = jest.spyOn(globalThis.crypto, 'getRandomValues');
    const mathRandom = jest.spyOn(Math, 'random');

    await randomBytes(32);

    expect(getRandomValues).not.toHaveBeenCalled();
    expect(mathRandom).not.toHaveBeenCalled();
  });
});
