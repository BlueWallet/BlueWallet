const mockPopPendingImage = jest.fn();

jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    getEnforcing: () => ({ popPendingImage: mockPopPendingImage }),
  },
}));

// Jest factories must be declared before this import.
// eslint-disable-next-line import/first
import { forwardPendingSharedQRCode, isSharedImageWakeUrl, popPendingSharedQRCode } from '../../blue_modules/incoming-image';

describe('incoming shared QR codes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('recognizes only the payload-free Apple wake-up link', () => {
    expect(isSharedImageWakeUrl('bluewallet://shared-image')).toBe(true);
    expect(isSharedImageWakeUrl('bluewallet://shared-qr?value=bitcoin%3Aattacker')).toBe(false);
    expect(isSharedImageWakeUrl('bluewallet://wallet/123')).toBe(false);
  });

  it('pops a QR payload decoded by the Android share handler', async () => {
    mockPopPendingImage.mockResolvedValue({ value: 'lightning:lnbc1example' });
    await expect(popPendingSharedQRCode()).resolves.toEqual({ value: 'lightning:lnbc1example' });
  });

  it('forwards the exact native-decoded content to the deep-link consumer', () => {
    const handler = jest.fn();
    const decodedContent = 'bitcoin:bc1qexample?amount=0.01&label=Café%20☕️';

    expect(forwardPendingSharedQRCode({ value: decodedContent }, handler)).toBe(true);
    expect(handler).toHaveBeenCalledWith(decodedContent);
    expect(forwardPendingSharedQRCode(null, handler)).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
