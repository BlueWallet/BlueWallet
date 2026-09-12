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

  it('rejects malformed base64 from the native module', async () => {
    jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockReturnValue('not valid base64!');

    await expect(randomBytes(32)).rejects.toThrow();
  });

  it('rejects a decoded length that differs from the request', async () => {
    jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockReturnValue('AQI=');

    await expect(randomBytes(32)).rejects.toThrow('Secure RNG length mismatch: expected 32, got 2');
  });

  it('propagates native errors including Chrome remote debugging failures', async () => {
    jest.spyOn(NativeModules.RNGetRandomValues, 'getRandomBase64').mockImplementation(() => {
      throw new Error('Calling synchronous methods on native modules is not supported in Chrome');
    });

    await expect(randomBytes(32)).rejects.toThrow('Calling synchronous methods on native modules is not supported in Chrome');
  });

  it('never routes through the insecure crypto polyfill', async () => {
    const getRandomValues = jest.spyOn(globalThis.crypto, 'getRandomValues');
    const mathRandom = jest.spyOn(Math, 'random');

    await randomBytes(32);

    expect(getRandomValues).not.toHaveBeenCalled();
    expect(mathRandom).not.toHaveBeenCalled();
  });
});
