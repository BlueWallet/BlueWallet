import {
  transitionPasswordStorageToSecurityOption,
  transitionSecurityOptionToPasswordStorage,
} from '../../screen/PromptPasswordConfirmationSheet';

describe('password-storage security transition', () => {
  const password = 'correct horse battery staple';
  const decryptStorage = jest.fn(async () => true);
  const encryptStorage = jest.fn(async () => undefined);
  const saveToDisk = jest.fn(async () => undefined);
  const setSecurityUseOption = jest.fn(async () => true);

  beforeEach(() => jest.clearAllMocks());

  it('decrypts before applying the selected native policy', async () => {
    await expect(
      transitionPasswordStorageToSecurityOption({
        password,
        targetOption: 'biometricsOrPasscode',
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).resolves.toBe(true);

    expect(decryptStorage).toHaveBeenCalledWith(password);
    expect(setSecurityUseOption).toHaveBeenCalledWith('biometricsOrPasscode');
    expect(decryptStorage.mock.invocationCallOrder[0]).toBeLessThan(setSecurityUseOption.mock.invocationCallOrder[0]);
    expect(encryptStorage).not.toHaveBeenCalled();
  });

  it('decrypts to Off without requesting native authentication', async () => {
    await expect(
      transitionPasswordStorageToSecurityOption({
        password,
        targetOption: 'disabled',
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).resolves.toBe(true);

    expect(decryptStorage).toHaveBeenCalledWith(password);
    expect(setSecurityUseOption).not.toHaveBeenCalled();
    expect(encryptStorage).not.toHaveBeenCalled();
  });

  it('restores password encryption when native authentication is cancelled', async () => {
    setSecurityUseOption.mockResolvedValueOnce(false);

    await expect(
      transitionPasswordStorageToSecurityOption({
        password,
        targetOption: 'devicePasscode',
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).resolves.toBe(false);

    expect(encryptStorage).toHaveBeenCalledWith(password);
    expect(saveToDisk).toHaveBeenCalledTimes(2);
  });

  it('restores password encryption before propagating a native-policy error', async () => {
    setSecurityUseOption.mockRejectedValueOnce(new Error('Keychain unavailable'));

    await expect(
      transitionPasswordStorageToSecurityOption({
        password,
        targetOption: 'devicePasscode',
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).rejects.toThrow('Keychain unavailable');

    expect(encryptStorage).toHaveBeenCalledWith(password);
    expect(saveToDisk).toHaveBeenCalledTimes(2);
  });
});

describe('native security to password-storage transition', () => {
  const password = 'correct horse battery staple';
  const decryptStorage = jest.fn(async () => true);
  const encryptStorage = jest.fn(async () => undefined);
  const saveToDisk = jest.fn(async () => undefined);
  const setSecurityUseOption = jest.fn(async () => true);

  beforeEach(() => jest.clearAllMocks());

  it('enables password protection directly when Wallets authentication is off', async () => {
    await expect(
      transitionSecurityOptionToPasswordStorage({
        password,
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).resolves.toBe(true);

    expect(encryptStorage).toHaveBeenCalledWith(password);
    expect(saveToDisk).toHaveBeenCalledTimes(1);
    expect(setSecurityUseOption).not.toHaveBeenCalled();
  });

  it('turns off the current Wallets authentication method after enabling password protection', async () => {
    await expect(
      transitionSecurityOptionToPasswordStorage({
        password,
        currentSecurityOption: 'biometricsOrPasscode',
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).resolves.toBe(true);

    expect(setSecurityUseOption).toHaveBeenCalledWith('disabled');
    expect(encryptStorage.mock.invocationCallOrder[0]).toBeLessThan(setSecurityUseOption.mock.invocationCallOrder[0]);
    expect(decryptStorage).not.toHaveBeenCalled();
  });

  it('restores the unprotected storage state when native confirmation is cancelled', async () => {
    setSecurityUseOption.mockResolvedValueOnce(false);

    await expect(
      transitionSecurityOptionToPasswordStorage({
        password,
        currentSecurityOption: 'devicePasscode',
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).resolves.toBe(false);

    expect(decryptStorage).toHaveBeenCalledWith(password);
    expect(saveToDisk).toHaveBeenCalledTimes(2);
  });

  it('restores the unprotected storage state before propagating a native-policy error', async () => {
    setSecurityUseOption.mockRejectedValueOnce(new Error('Keychain unavailable'));

    await expect(
      transitionSecurityOptionToPasswordStorage({
        password,
        currentSecurityOption: 'devicePasscode',
        decryptStorage,
        encryptStorage,
        saveToDisk,
        setSecurityUseOption,
      }),
    ).rejects.toThrow('Keychain unavailable');

    expect(decryptStorage).toHaveBeenCalledWith(password);
    expect(saveToDisk).toHaveBeenCalledTimes(2);
  });
});
