const mockPopPendingImage = jest.fn();
const mockDecodeImage = jest.fn();

jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    get: () => ({ decodeImage: mockDecodeImage, popPendingImage: mockPopPendingImage }),
  },
}));

// Jest factories must be declared before this import.
// eslint-disable-next-line import/first
import {
  decodeQRCodeImage,
  dispatchIncomingUrl,
  forwardPendingSharedQRCode,
  isSharedImageWakeUrl,
  pendingSharedBitcoinAddresses,
  popPendingSharedQRCode,
} from '../../blue_modules/incoming-image';

describe('incoming shared QR codes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('recognizes only the payload-free Apple wake-up link', () => {
    expect(isSharedImageWakeUrl('bluewallet://shared-image')).toBe(true);
    expect(isSharedImageWakeUrl('bluewallet://shared-image/')).toBe(true);
    expect(isSharedImageWakeUrl('bluewallet://shared-image?value=bitcoin%3Aattacker')).toBe(false);
    expect(isSharedImageWakeUrl('bluewallet://shared-image/anything')).toBe(false);
    expect(isSharedImageWakeUrl('bluewallet://shared-image#payload')).toBe(false);
    expect(isSharedImageWakeUrl('bluewallet://shared-qr?value=bitcoin%3Aattacker')).toBe(false);
    expect(isSharedImageWakeUrl('bluewallet://wallet/123')).toBe(false);
  });

  it('pops a QR payload decoded by the Android share handler', async () => {
    mockPopPendingImage.mockResolvedValue({ value: 'lightning:lnbc1example' });
    await expect(popPendingSharedQRCode()).resolves.toEqual({ value: 'lightning:lnbc1example' });
  });

  it('decodes selected images with the shared native decoder', async () => {
    mockDecodeImage.mockResolvedValue('bitcoin:bc1qexample');

    await expect(decodeQRCodeImage('base64-image')).resolves.toBe('bitcoin:bc1qexample');
    expect(mockDecodeImage).toHaveBeenCalledWith('base64-image');
  });

  it('forwards the exact native-decoded content to the deep-link consumer', () => {
    const handler = jest.fn();
    const decodedContent = 'bitcoin:bc1qexample?amount=0.01&label=Café%20☕️';

    expect(forwardPendingSharedQRCode({ value: decodedContent }, handler)).toBe(true);
    expect(handler).toHaveBeenCalledWith(decodedContent);
    expect(forwardPendingSharedQRCode(null, handler)).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('filters and deduplicates shared QR payloads to Bitcoin addresses', () => {
    expect(
      pendingSharedBitcoinAddresses({
        values: [
          'BITCOIN://1BoatSLRHtKNngkdXEeobR76b53LETtpyT?amount=1',
          'lightning:lnbc1invalid',
          '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
          '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        ],
      }),
    ).toEqual(['1BoatSLRHtKNngkdXEeobR76b53LETtpyT', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy']);
  });

  it.each([
    'bitcoin:bc1qexample?message=pay%26go',
    'content://com.android.externalstorage.documents/document/primary%3ADownload%2Ftx.psbt',
    'file:///private/var/mobile/Inbox/payment%20request.psbt',
  ])('preserves reserved characters in ordinary deeplinks: %s', async url => {
    const processSharedImage = jest.fn();
    const processDeeplink = jest.fn();

    await expect(dispatchIncomingUrl(url, processSharedImage, processDeeplink)).resolves.toBe('deeplink');
    expect(processSharedImage).not.toHaveBeenCalled();
    expect(processDeeplink).toHaveBeenCalledWith(url);
  });

  it('routes only the payload-free wake URL to native shared-image storage', async () => {
    const processSharedImage = jest.fn().mockResolvedValue(undefined);
    const processDeeplink = jest.fn();

    await expect(dispatchIncomingUrl('bluewallet://shared-image', processSharedImage, processDeeplink)).resolves.toBe('shared-image');
    expect(processSharedImage).toHaveBeenCalledTimes(1);
    expect(processDeeplink).not.toHaveBeenCalled();
  });
});
