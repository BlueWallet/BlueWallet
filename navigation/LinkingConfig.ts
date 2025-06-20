import { Linking, Platform } from 'react-native';
import { LinkingOptions } from '@react-navigation/native';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { SendDetailsStackParamList } from './SendDetailsStackParamList';
import RNQRGenerator from 'rn-qr-generator';
import type { TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';
import Lnurl from '../class/lnurl';
import presentAlert from '../components/Alert';
import loc from '../loc';
import { readFileOutsideSandbox } from '../blue_modules/fs';
import { WatchOnlyWallet } from '../class';
import Azteco from '../class/azteco';
import bip21, { TOptions } from 'bip21';
import * as bitcoin from 'bitcoinjs-lib';
import { parse as parseUrl } from 'url';

// Module-level storage for wallet context accessible by LinkingConfig
let currentWallets: TWallet[] = [];
let currentSetSharedCosigner: ((cosigner: string) => void) | undefined;

// Update the wallet context for LinkingConfig
export const updateWalletContext = (wallets: TWallet[]) => {
  currentWallets = wallets;
};

// Update additional context functions for LinkingConfig
export const updateLinkingContext = (context: {
  saveToDisk?: () => void;
  addWallet?: (wallet: TWallet) => void;
  setSharedCosigner?: (cosigner: string) => void;
}) => {
  if (context.setSharedCosigner) currentSetSharedCosigner = context.setSharedCosigner;
};

// Get the first available wallet for widget actions
const getFirstWallet = (): TWallet | undefined => {
  return currentWallets.length > 0 ? currentWallets[0] : undefined;
};

/**
 * Check if a URL has a schema that should be handled by deep link processing
 * (replacement for DeeplinkSchemaMatch.hasSchema)
 */
export const hasDeepLinkSchema = (schemaString: string): boolean => {
  if (typeof schemaString !== 'string' || schemaString.length <= 0) return false;
  const lowercaseString = schemaString.trim().toLowerCase();

  // Bitcoin and Lightning schemas are now handled by React Navigation 7 linking
  // Exclude them from deep link processing
  if (
    lowercaseString.startsWith('bitcoin:') ||
    lowercaseString.startsWith('lightning:') ||
    lowercaseString.startsWith('bluewallet:bitcoin:') ||
    lowercaseString.startsWith('bluewallet:lightning:')
  ) {
    return false;
  }

  return (
    // Legacy schemas are still handled by deep link processing
    lowercaseString.startsWith('blue:') ||
    lowercaseString.startsWith('bluewallet:') ||
    lowercaseString.startsWith('lapp:') ||
    // Also handle file-based URLs for PSBT, cosigner, and Azteco
    isPossiblySignedPSBTFile(schemaString) ||
    isPossiblyCosignerFile(schemaString) ||
    Azteco.isRedeemUrl(schemaString) ||
    // Handle watch-only wallet imports
    isWatchOnlyWalletFormat(schemaString)
  );
};

const isWatchOnlyWalletFormat = (url: string): boolean => {
  try {
    // Simple check for common watch-only wallet formats
    return url.includes('xpub') || url.includes('ypub') || url.includes('zpub');
  } catch {
    return false;
  }
};

/**
 * Check if a string is a Bitcoin address (for backward compatibility with tests)
 */
export const isBitcoinAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  // Simple validation - check for common Bitcoin address patterns
  const cleanAddress = address.trim();
  return (
    // Legacy P2PKH (starts with 1)
    /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(cleanAddress) ||
    // P2SH (starts with 3)
    /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(cleanAddress) ||
    // Bech32 (starts with bc1)
    /^bc1[a-z0-9]{39,59}$/.test(cleanAddress.toLowerCase())
  );
};

/**
 * Check if a string is a Lightning invoice (for backward compatibility with tests)
 */
export const isLightningInvoice = (invoice: string): boolean => {
  if (!invoice || typeof invoice !== 'string') return false;
  const cleanInvoice = invoice.toLowerCase().replace('lightning://', '').replace('lightning:', '');
  return cleanInvoice.startsWith('lnbc') || cleanInvoice.startsWith('lntb') || cleanInvoice.startsWith('lnbcrt');
};

/**
 * Check if a URL contains both Bitcoin and Lightning URIs
 */
export const isBothBitcoinAndLightning = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const lowerUrl = url.toLowerCase();
  // Check for both bitcoin scheme AND lightning parameter
  return (
    (lowerUrl.includes('bitcoin:') || lowerUrl.includes('bitcoin//')) &&
    (lowerUrl.includes('lightning:') || lowerUrl.includes('lightning='))
  );
};

/**
 * Helper function to detect Bitcoin URIs in all supported formats
 * Used to determine if React Navigation 7 linking should handle this URI
 */
export const isBitcoinUri = (uri: string): boolean => {
  const lowerUri = uri.toLowerCase();
  return (
    lowerUri.startsWith('bitcoin:') ||
    lowerUri.startsWith('bitcoin://') ||
    lowerUri.startsWith('bluewallet://bitcoin:') ||
    lowerUri.startsWith('bluewallet://bitcoin://') ||
    lowerUri.startsWith('bluewallet:bitcoin:') || // Add single colon support
    // Also check for Bitcoin addresses (when scheme is stripped)
    /^(bc1|[13]|tb1|bcrt1)[a-zA-Z0-9]{25,87}(\?.*)?$/i.test(uri) ||
    /^[a-fA-F0-9]{64}(\?.*)?$/.test(uri)
  );
};

/**
 * Helper function to detect Lightning URIs in all supported formats
 * Used to determine if React Navigation 7 linking should handle this URI
 */
export const isLightningUri = (uri: string): boolean => {
  const lowerUri = uri.toLowerCase();
  return (
    lowerUri.startsWith('lightning:') ||
    lowerUri.startsWith('lightning://') ||
    lowerUri.startsWith('bluewallet://lightning:') ||
    lowerUri.startsWith('bluewallet://lightning://') ||
    lowerUri.startsWith('bluewallet:lightning:') || // Add single colon support
    // Also check for Lightning invoices (when scheme is stripped)
    /^lnbc[a-z0-9]+$/i.test(uri) ||
    /^lnbcrt[a-z0-9]+$/i.test(uri) ||
    /^lntb[a-z0-9]+$/i.test(uri) ||
    /^lntbs[a-z0-9]+$/i.test(uri) ||
    lowerUri.startsWith('lnb')
  );
};

/**
 * Helper function to detect PSBT files
 */
export const isPossiblySignedPSBTFile = (filePath: string): boolean => {
  return (
    (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) &&
    filePath.toLowerCase().endsWith('-signed.psbt')
  );
};

/**
 * Helper function to detect cosigner files
 */
export const isPossiblyCosignerFile = (filePath: string): boolean => {
  return (
    (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) &&
    filePath.toLowerCase().endsWith('.bwcosigner')
  );
};

/**
 * Helper function to check if a string contains necessary JSON keys for multisig sharing
 */
export const hasNeededJsonKeysForMultiSigSharing = (str: string): boolean => {
  let obj;
  try {
    obj = JSON.parse(str);
  } catch (e) {
    return false;
  }
  return typeof obj.xfp === 'string' && typeof obj.xpub === 'string' && typeof obj.path === 'string';
};

/**
 * Helper function to detect widget actions
 */
export const isWidgetAction = (text: string): boolean => {
  return text.startsWith('widget?action=');
};

// Process a URL, decoding a QR code image if necessary
async function processUrl(url: string): Promise<string | null> {
  if (url.startsWith('data:image/') || url.startsWith('file://')) {
    console.log('🔗 Processing QR code image URL:', url.substring(0, 100) + '...');
    try {
      let qrResult;

      if (url.startsWith('data:image/')) {
        // Handle data URI format
        if (!url.includes('base64,')) {
          console.warn('🔗 Invalid data URI format - no base64 data found');
          return null;
        }

        // Try method 1: Direct URI detection (used in most places)
        try {
          console.log('🔗 Trying QR detection with URI parameter (data URI)');
          qrResult = await RNQRGenerator.detect({ uri: url });
          console.log('🔗 QR detection result (URI method):', qrResult);
        } catch (uriError) {
          console.log('🔗 URI method failed, trying base64 method:', uriError);

          // Try method 2: Base64 detection (used in AddressInputScanButton)
          const base64Data = url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
          if (base64Data && base64Data !== url) {
            console.log('🔗 Trying QR detection with base64 parameter');
            qrResult = await RNQRGenerator.detect({ base64: base64Data });
            console.log('🔗 QR detection result (base64 method):', qrResult);
          } else {
            console.warn('🔗 Could not extract base64 data from URL');
            throw uriError;
          }
        }
      } else if (url.startsWith('file://')) {
        // Handle file:// URL (shared images from iOS/Android)
        console.log('🔗 Trying QR detection with file URI parameter');
        try {
          // Use the file URI directly for QR detection
          qrResult = await RNQRGenerator.detect({ uri: url });
          console.log('🔗 QR detection result (file URI method):', qrResult);
        } catch (fileError) {
          console.log('🔗 File URI method failed, trying with decodeURI:', fileError);
          // Try with decoded URI in case of encoding issues
          try {
            const decodedFileUrl = decodeURI(url);
            qrResult = await RNQRGenerator.detect({ uri: decodedFileUrl });
            console.log('🔗 QR detection result (decoded file URI method):', qrResult);
          } catch (decodedError) {
            console.error('🔗 Both file URI methods failed:', decodedError);
            throw fileError;
          }
        }
      }

      if (qrResult && qrResult.values && qrResult.values.length > 0) {
        const decodedValue = qrResult.values[0];
        console.log('🔗 QR code decoded successfully:', decodedValue);

        // Validate that the decoded value is not empty
        if (decodedValue && decodedValue.trim().length > 0) {
          return decodedValue.trim();
        } else {
          console.warn('🔗 QR code decoded but value is empty');
          return null;
        }
      }
      console.warn('🔗 QR code detection returned no values');
      return null;
    } catch (e) {
      console.error('🔗 Error decoding QR code image', e);
      return null;
    }
  }
  return url;
}

/**
 * Linking configuration for React Navigation 7
 * Currently handling bitcoin:// and lightning:// schemas for direct navigation
 * Other schemas will be handled by the fallback (old implementation)
 */
const LinkingConfig: LinkingOptions<DetailViewStackParamList> = {
  prefixes: [
    // Bitcoin URI schemes
    'bitcoin://',
    'bitcoin:',
    'bluewallet://bitcoin://',
    'bluewallet://bitcoin:',
    'bluewallet:bitcoin:', // Add support for single colon format
    'BITCOIN://',
    'BITCOIN:',
    // Lightning URI schemes
    'lightning://',
    'lightning:',
    'bluewallet://lightning://',
    'bluewallet://lightning:',
    'bluewallet:lightning:', // Add support for single colon format
    'LIGHTNING://',
    'LIGHTNING:',
    // Only include app-specific scheme on mobile platforms
    ...(Platform.OS !== 'web' ? ['bluewallet://'] : []),
  ],
  // Custom subscription to handle QR code images before React Navigation
  subscribe(listener) {
    console.log('🔗 LinkingConfig.subscribe called - setting up URL listener');
    const onReceiveURL = async ({ url }: { url: string }) => {
      console.log('🔗 LinkingConfig.subscribe received URL:', url);
      const processedUrl = await processUrl(url);
      console.log('🔗 LinkingConfig.subscribe processed URL:', processedUrl);

      if (processedUrl) {
        // Let all processed URLs go through the normal routing logic
        console.log('🔗 Calling listener with processed URL:', processedUrl);
        listener(processedUrl);
      } else if (!url.startsWith('data:image/') && !url.startsWith('file://')) {
        // If it's not a data:image or file:// URL and processing failed, still pass the original URL
        console.log('🔗 Calling listener with original URL:', url);
        listener(url);
      } else {
        console.warn('🔗 QR code processing failed and no fallback available for:', url);
        // Show alert to user about QR code processing failure
        presentAlert({ message: loc.send.qr_error_no_qrcode });
      }
    };

    // Listen to incoming links from deep linking
    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      // Clean up the subscription
      subscription.remove();
    };
  },

  // Custom getInitialURL to handle QR code images on app launch
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    console.log('🔗 LinkingConfig.getInitialURL received URL:', url);

    if (url) {
      const processedUrl = await processUrl(url);
      console.log('🔗 LinkingConfig.getInitialURL processed URL:', processedUrl);

      if (processedUrl) {
        // Let all processed URLs go through the normal routing logic
        return processedUrl;
      } else if (!url.startsWith('data:image/') && !url.startsWith('file://')) {
        // If it's not a data:image or file:// URL and processing failed, still return the original URL
        return url;
      } else {
        console.warn('🔗 QR code processing failed and no fallback available for:', url);
        // Show alert to user about QR code processing failure
        presentAlert({ message: loc.send.qr_error_no_qrcode });
        return null;
      }
    }
    return url;
  },

  config: {
    screens: {
      // Route bitcoin URIs directly to SendDetailsRoot
      SendDetailsRoot: {
        path: 'send/:uri?',
        parse: {
          // Make sure we can parse the URI correctly from the path parameter
          uri: uri => {
            // If the URI is already in bitcoin: format, return as is
            if (uri && uri.toLowerCase().startsWith('bitcoin:')) {
              return uri;
            }
            // Otherwise, prefix with bitcoin: to ensure proper handling
            return uri ? `bitcoin:${uri}` : undefined;
          },
        },
      },
      // Route lightning URIs to ScanLNDInvoiceRoot
      ScanLNDInvoiceRoot: {
        path: 'lightning/:uri?',
        parse: {
          // Make sure we can parse the URI correctly from the path parameter
          uri: uri => {
            // If the URI is already in lightning: format, return as is
            if (uri && uri.toLowerCase().startsWith('lightning:')) {
              return uri;
            }
            // Otherwise, prefix with lightning: to ensure proper handling
            return uri ? `lightning:${uri}` : undefined;
          },
        },
      },
      // Add a fallback/catch-all route for unhandled URLs
      DrawerRoot: '*',
    },
  },
  // Custom state from path for all URIs - handles everything centrally
  getStateFromPath(path, options) {
    console.log('🔗 getStateFromPath called with path:', path);
    if (!path) return undefined;

    // Decode the URL if needed
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(path);
    } catch (e) {
      decodedUrl = path;
    }
    console.log('🔗 getStateFromPath decoded URL:', decodedUrl);

    const lowerPath = decodedUrl.toLowerCase();

    // Handle LNURL and Lightning addresses (including QR code decoded URLs)
    if (Lnurl.isLnurl(decodedUrl) || Lnurl.isLightningAddress(decodedUrl)) {
      return {
        routes: [
          {
            name: 'ScanLNDInvoiceRoot' as keyof DetailViewStackParamList,
            params: {
              screen: 'ScanLNDInvoice',
              params: {
                uri: decodedUrl,
                walletID: undefined,
                invoice: undefined,
                onBarScanned: undefined,
              },
            },
          },
        ],
      };
    }

    // Handle PSBT files
    if (isPossiblySignedPSBTFile(decodedUrl)) {
      // Handle signed PSBT files asynchronously
      readFileOutsideSandbox(decodeURI(decodedUrl))
        .then(file => {
          if (file) {
            // Navigate to PSBT signing screen
            // Since getStateFromPath is synchronous, we'll handle this case differently
            console.log('🔗 PSBT file detected, handling via separate navigation');
          }
        })
        .catch(e => console.warn('Error reading PSBT file:', e));
      
      // Return a temporary navigation state for now
      return {
        routes: [
          {
            name: 'SendDetailsRoot' as keyof DetailViewStackParamList,
            params: {
              screen: 'PsbtWithHardwareWallet',
              params: {
                deepLinkPSBT: decodedUrl, // Pass the URL for later processing
              },
            },
          },
        ],
      };
    }

    // Handle cosigner files
    if (isPossiblyCosignerFile(decodedUrl)) {
      // Handle cosigner files asynchronously
      readFileOutsideSandbox(decodeURI(decodedUrl))
        .then(file => {
          if (file && hasNeededJsonKeysForMultiSigSharing(file) && currentSetSharedCosigner) {
            currentSetSharedCosigner(file);
          }
        })
        .catch(e => console.warn('Error reading cosigner file:', e));
      
      // Return to DrawerRoot since cosigner import doesn't need special navigation
      return {
        routes: [
          {
            name: 'DrawerRoot' as keyof DetailViewStackParamList,
          },
        ],
      };
    }

    // Handle Azteco voucher URLs
    if (Azteco.isRedeemUrl(decodedUrl)) {
      return {
        routes: [
          {
            name: 'AztecoRedeemRoot' as keyof DetailViewStackParamList,
            params: {
              screen: 'AztecoRedeem',
              params: Azteco.getParamsFromUrl(decodedUrl),
            },
          },
        ],
      };
    }

    // Handle watch-only wallet imports
    if (new WatchOnlyWallet().setSecret(decodedUrl).init().valid()) {
      return {
        routes: [
          {
            name: 'AddWalletRoot' as keyof DetailViewStackParamList,
            params: {
              screen: 'ImportWallet',
              params: {
                triggerImport: true,
                label: decodedUrl,
              },
            },
          },
        ],
      };
    }

    // Handle legacy BlueWallet settings URLs directly
    // Note: The bluewallet: scheme is stripped by React Navigation, so we match without it
    if (decodedUrl.startsWith('setelectrumserver')) {
      // Manual URL parsing since URLSearchParams is not available in Hermes
      const queryString = decodedUrl.split('?')[1] || '';
      const serverMatch = queryString.match(/(?:^|&)server=([^&]*)/);
      if (serverMatch && serverMatch[1]) {
        const decodedServer = decodeURIComponent(serverMatch[1]);

        // Parse the server string format: host:port:type (where type 's' = SSL)
        const [host, port, type] = decodedServer.split(':');
        const serverItem = {
          host,
          ...(type === 's' ? { ssl: Number(port) } : { tcp: Number(port) }),
        };

        const navigationState = {
          routes: [
            {
              name: 'DrawerRoot',
              state: {
                routes: [
                  {
                    name: 'DetailViewStackScreensStack',
                    state: {
                      routes: [
                        {
                          name: 'ElectrumSettings',
                          params: { server: serverItem },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
        return navigationState;
      }
    }

    if (decodedUrl.startsWith('setlndhuburl')) {
      // Manual URL parsing since URLSearchParams is not available in Hermes
      const queryString = decodedUrl.split('?')[1] || '';
      const urlMatch = queryString.match(/(?:^|&)url=([^&]*)/);
      if (urlMatch && urlMatch[1]) {
        const decodedLndhubUrl = decodeURIComponent(urlMatch[1]);
        const navigationState = {
          routes: [
            {
              name: 'DrawerRoot',
              state: {
                routes: [
                  {
                    name: 'DetailViewStackScreensStack',
                    state: {
                      routes: [
                        {
                          name: 'LightningSettings',
                          params: { url: decodedLndhubUrl },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
        return navigationState;
      }
    }

    // Handle Bitcoin URIs - check both with and without scheme prefix
    // React Navigation might strip the scheme prefix before calling getStateFromPath
    if (isBitcoinUri(decodedUrl)) {
      let uri = decodedUrl;

      // Normalize the URI format - add bitcoin: prefix if missing
      if (lowerPath.startsWith('bitcoin://')) {
        uri = 'bitcoin:' + decodedUrl.substring('bitcoin://'.length);
      } else if (lowerPath.startsWith('bluewallet://bitcoin:')) {
        uri = 'bitcoin:' + decodedUrl.substring('bluewallet://bitcoin:'.length);
      } else if (lowerPath.startsWith('bluewallet://bitcoin://')) {
        uri = 'bitcoin:' + decodedUrl.substring('bluewallet://bitcoin://'.length);
      } else if (lowerPath.startsWith('bluewallet:bitcoin:')) {
        uri = 'bitcoin:' + decodedUrl.substring('bluewallet:bitcoin:'.length);
      } else if (!lowerPath.startsWith('bitcoin:')) {
        // Add bitcoin: prefix if it's missing (React Navigation stripped it or it's a QR decoded address)
        uri = 'bitcoin:' + decodedUrl;
      }

      console.log('🔗 Bitcoin URI detected, normalized to:', uri);

      return {
        routes: [
          {
            name: 'SendDetailsRoot' as keyof DetailViewStackParamList,
            params: {
              screen: 'SendDetails' as keyof SendDetailsStackParamList,
              params: { uri },
            },
          },
        ],
      };
    }

    // Handle Lightning URIs - check both with and without scheme prefix
    // React Navigation might strip the scheme prefix before calling getStateFromPath
    if (isLightningUri(decodedUrl)) {
      let uri = decodedUrl;

      // Normalize the URI format - add lightning: prefix if missing
      if (lowerPath.startsWith('lightning://')) {
        uri = 'lightning:' + decodedUrl.substring('lightning://'.length);
      } else if (lowerPath.startsWith('bluewallet://lightning:')) {
        uri = 'lightning:' + decodedUrl.substring('bluewallet://lightning:'.length);
      } else if (lowerPath.startsWith('bluewallet://lightning://')) {
        uri = 'lightning:' + decodedUrl.substring('bluewallet://lightning://'.length);
      } else if (lowerPath.startsWith('bluewallet:lightning:')) {
        uri = 'lightning:' + decodedUrl.substring('bluewallet:lightning:'.length);
      } else if (!lowerPath.startsWith('lightning:')) {
        // Add lightning: prefix if it's missing (React Navigation stripped it or it's a QR decoded invoice)
        uri = 'lightning:' + decodedUrl;
      }

      console.log('🔗 Lightning URI detected, normalized to:', uri);

      return {
        routes: [
          {
            name: 'ScanLNDInvoiceRoot' as keyof DetailViewStackParamList,
            params: {
              screen: 'ScanLNDInvoice',
              params: {
                uri,
                walletID: undefined,
                invoice: undefined,
                onBarScanned: undefined,
              },
            },
          },
        ],
      };
    }

    // Handle widget actions
    if (decodedUrl.startsWith('widget?action=')) {
      const action = decodedUrl.split('widget?action=')[1];

      // Get the first wallet to avoid crashes
      const firstWallet = getFirstWallet();
      if (!firstWallet) {
        console.warn('🔗 No wallets available for widget action, cannot proceed');
        return undefined;
      }

      const walletID = firstWallet.getID();

      if (action === 'openSend') {
        // Route based on wallet type (like the original DeeplinkSchemaMatch logic)
        if (firstWallet.chain === Chain.ONCHAIN) {
          const navigationState = {
            routes: [
              {
                name: 'SendDetailsRoot',
                params: {
                  screen: 'SendDetails',
                  params: {
                    walletID,
                  },
                },
              },
            ],
          };
          return navigationState;
        } else if (firstWallet.chain === Chain.OFFCHAIN) {
          const navigationState = {
            routes: [
              {
                name: 'ScanLNDInvoiceRoot',
                params: {
                  screen: 'ScanLNDInvoice',
                  params: {
                    walletID,
                  },
                },
              },
            ],
          };
          return navigationState;
        }
      } else if (action === 'openReceive') {
        // Route based on wallet type (like the original DeeplinkSchemaMatch logic)
        if (firstWallet.chain === Chain.ONCHAIN) {
          const navigationState = {
            routes: [
              {
                name: 'DrawerRoot',
                state: {
                  routes: [
                    {
                      name: 'DetailViewStackScreensStack',
                      state: {
                        routes: [
                          {
                            name: 'ReceiveDetails',
                            params: {
                              walletID,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          };
          return navigationState;
        } else if (firstWallet.chain === Chain.OFFCHAIN) {
          const navigationState = {
            routes: [
              {
                name: 'LNDCreateInvoiceRoot',
                params: {
                  screen: 'LNDCreateInvoice',
                  params: {
                    walletID,
                  },
                },
              },
            ],
          };
          return navigationState;
        }
      }
    }

    // Handle notification-based navigation
    // Format: notification://wallet/{type}/{address|txid}
    if (lowerPath.startsWith('notification://') || lowerPath.startsWith('bluewallet://notification:')) {
      try {
        let notificationPath = decodedUrl;
        if (notificationPath.startsWith('bluewallet://notification:')) {
          notificationPath = notificationPath.replace('bluewallet://notification:', 'notification://');
        }
        
        // Parse notification URL manually
        const urlParts = notificationPath.replace('notification://', '').split('/');
        const pathParts = urlParts.filter((part: string) => part.length > 0);
        
        if (pathParts.length >= 3 && pathParts[0] === 'wallet') {
          const type = parseInt(pathParts[1], 10);
          const identifier = pathParts[2]; // Could be address or txid
          
          // Create a notification payload from the URL
          const payload: TNotificationPayload = {
            type,
            address: type === 2 || type === 3 ? identifier : '',
            txid: type === 1 || type === 4 ? identifier : '',
            hash: type === 1 || type === 4 ? identifier : '',
            foreground: false,
            userInteraction: true,
            subText: '',
            message: '',
          };
          
          console.log('🔔 Processing notification URL:', payload);
          const navigationState = getNavigationStateForNotification(payload, currentWallets);
          if (navigationState) {
            console.log('🔔 Navigating to:', navigationState);
            // Directly return the navigation state for notifications
            return navigationState;
          }
        }
      } catch (e) {
        console.error('🔔 Error processing notification URL:', e);
      }
    }

    // Default to undefined if no conditions match
    return undefined;
  },
};

// ========================================
// DeeplinkSchemaMatch utility functions
// ========================================

type TCompletionHandlerParams = [string, object];
type TContext = {
  wallets: TWallet[];
  saveToDisk: () => void;
  addWallet: (wallet: TWallet) => void;
  setSharedCosigner: (cosigner: string) => void;
};

type TBothBitcoinAndLightning = { bitcoin: string; lndInvoice: string } | undefined;

/**
 * Check if a file is a TXN file
 */
export const isTXNFile = (filePath: string): boolean => {
  return (
    (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) && filePath.toLowerCase().endsWith('.txn')
  );
};

/**
 * Check if a file is possibly a PSBT file
 */
export const isPossiblyPSBTFile = (filePath: string): boolean => {
  return (
    (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) &&
    filePath.toLowerCase().endsWith('.psbt')
  );
};

/**
 * Get server from a deeplink like `bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As`
 */
export const getServerFromSetElectrumServerAction = (url: string): string | false => {
  if (!url.startsWith('bluewallet:setelectrumserver') && !url.startsWith('setelectrumserver')) return false;
  const splt = url.split('server=');
  if (splt[1]) return decodeURIComponent(splt[1]);
  return false;
};

/**
 * Get url from a deeplink like `bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com`
 */
export const getUrlFromSetLndhubUrlAction = (url: string): string | false => {
  if (!url.startsWith('bluewallet:setlndhuburl') && !url.startsWith('setlndhuburl')) return false;
  const splt = url.split('url=');
  if (splt[1]) return decodeURIComponent(splt[1]);
  return false;
};

/**
 * Check if URL contains both Bitcoin and Lightning URIs
 */
export const isBothBitcoinAndLightningUrl = (url: string): TBothBitcoinAndLightning => {
  if (url.includes('lightning') && (url.includes('bitcoin') || url.includes('BITCOIN'))) {
    const txInfo = url.split(/(bitcoin:\/\/|BITCOIN:\/\/|bitcoin:|BITCOIN:|lightning:|lightning=|bitcoin=)+/);
    let btc: string | false = false;
    let lndInvoice: string | false = false;
    for (const [index, value] of txInfo.entries()) {
      try {
        if (value.startsWith('bitcoin') || value.startsWith('BITCOIN')) {
          btc = `bitcoin:${txInfo[index + 1]}`;
          if (!isBitcoinAddress(btc)) {
            btc = false;
            break;
          }
        } else if (value.startsWith('lightning')) {
          const lnpart = txInfo[index + 1].split('&').find(el => el.toLowerCase().startsWith('ln'));
          lndInvoice = `lightning:${lnpart}`;
          if (!isLightningInvoice(lndInvoice)) {
            lndInvoice = false;
            break;
          }
        }
      } catch (e) {
        console.log(e);
      }
      if (btc && lndInvoice) break;
    }
    if (btc && lndInvoice) {
      return { bitcoin: btc, lndInvoice };
    } else {
      return undefined;
    }
  }
  return undefined;
};

/**
 * Enhanced Bitcoin address validation (replaces deprecated DeeplinkSchemaMatch.isBitcoinAddress)
 */
export const isBitcoinAddressStrict = (address: string): boolean => {
  const cleanAddress = address.replace('://', ':').replace('bitcoin:', '').replace('BITCOIN:', '').replace('bitcoin=', '').split('?')[0];
  let isValidBitcoinAddress = false;
  try {
    bitcoin.address.toOutputScript(cleanAddress);
    isValidBitcoinAddress = true;
  } catch (err) {
    isValidBitcoinAddress = false;
  }
  return isValidBitcoinAddress;
};

/**
 * BIP21 decoder
 */
export const bip21decode = (uri?: string) => {
  if (!uri) {
    throw new Error('No URI provided');
  }
  let replacedUri = uri;
  for (const replaceMe of ['BITCOIN://', 'bitcoin://', 'BITCOIN:']) {
    replacedUri = replacedUri.replace(replaceMe, 'bitcoin:');
  }
  return bip21.decode(replacedUri);
};

/**
 * BIP21 encoder
 */
export const bip21encode = (address: string, options?: TOptions): string => {
  // uppercase address if bech32 to satisfy BIP_0173
  const isBech32 = address.startsWith('bc1');
  if (isBech32) {
    address = address.toUpperCase();
  }

  for (const key in options) {
    if (key === 'label' && String(options[key]).replace(' ', '').length === 0) {
      delete options[key];
    }
    if (key === 'amount' && !(Number(options[key]) > 0)) {
      delete options[key];
    }
  }
  return bip21.encode(address, options);
};

/**
 * Decode Bitcoin URI to extract address, amount, memo, and payjoin URL
 */
export const decodeBitcoinUri = (uri: string) => {
  let amount;
  let address = uri || '';
  let memo = '';
  let payjoinUrl = '';
  try {
    const parsedBitcoinUri = bip21decode(uri);
    address = parsedBitcoinUri.address ? parsedBitcoinUri.address.toString() : address;
    if ('options' in parsedBitcoinUri) {
      if (parsedBitcoinUri.options.amount) {
        amount = Number(parsedBitcoinUri.options.amount);
      }
      if (parsedBitcoinUri.options.label) {
        memo = parsedBitcoinUri.options.label;
      }
      if (parsedBitcoinUri.options.pj) {
        payjoinUrl = parsedBitcoinUri.options.pj;
      }
    }
  } catch (_) {}
  return { address, amount, memo, payjoinUrl };
};

/**
 * Handle wallet selection for both Bitcoin and Lightning
 */
export const isBothBitcoinAndLightningOnWalletSelect = (wallet: TWallet, uri: any): TCompletionHandlerParams => {
  if (wallet.chain === Chain.ONCHAIN) {
    return [
      'SendDetailsRoot',
      {
        screen: 'SendDetails',
        params: {
          uri: uri.bitcoin,
          walletID: wallet.getID(),
        },
      },
    ];
  } else {
    return [
      'ScanLNDInvoiceRoot',
      {
        screen: 'ScanLNDInvoice',
        params: {
          uri: uri.lndInvoice,
          walletID: wallet.getID(),
        },
      },
    ];
  }
};

/**
 * Main navigation routing function - replaces DeeplinkSchemaMatch.navigationRouteFor
 * Examines the content of the event parameter and creates navigation dictionaries
 */
export const navigationRouteFor = async (
  event: { url: string },
  completionHandler: (params: TCompletionHandlerParams) => void,
  context: TContext,
): Promise<void> => {
  if (!event.url) return;

  let url = event.url.trim();

  if (url.startsWith('data:image')) {
    try {
      const qrResult = await RNQRGenerator.detect({ uri: url });
      if (qrResult.values && qrResult.values.length > 0) {
        url = qrResult.values[0];
      } else {
        throw new Error('No QR code found in image');
      }
    } catch (e) {
      console.error(e);
      return;
    }
  }

  const { wallets } = context;

  if (url === null) {
    return;
  }
  if (typeof url !== 'string') {
    return;
  }

  if (url.toLowerCase().startsWith('bluewallet:bitcoin:') || url.toLowerCase().startsWith('bluewallet:lightning:')) {
    url = url.substring(11);
  } else if (url.toLocaleLowerCase().startsWith('bluewallet://widget?action=')) {
    url = url.substring('bluewallet://'.length);
  }

  if (isWidgetAction(url)) {
    if (wallets.length >= 0) {
      const wallet = wallets[0];
      const action = url.split('widget?action=')[1];
      if (wallet.chain === Chain.ONCHAIN) {
        if (action === 'openSend') {
          completionHandler([
            'SendDetailsRoot',
            {
              screen: 'SendDetails',
              params: {
                walletID: wallet.getID(),
              },
            },
          ]);
        } else if (action === 'openReceive') {
          completionHandler([
            'DetailViewStackScreensStack',
            {
              screen: 'ReceiveDetails',
              params: {
                walletID: wallet.getID(),
              },
            },
          ]);
        }
      } else if (wallet.chain === Chain.OFFCHAIN) {
        if (action === 'openSend') {
          completionHandler([
            'ScanLNDInvoiceRoot',
            {
              screen: 'ScanLNDInvoice',
              params: {
                walletID: wallet.getID(),
              },
            },
          ]);
        } else if (action === 'openReceive') {
          completionHandler(['LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { walletID: wallet.getID() } }]);
        }
      }
    }
  } else if (isPossiblySignedPSBTFile(url)) {
    readFileOutsideSandbox(decodeURI(url))
      .then(file => {
        if (file) {
          completionHandler([
            'SendDetailsRoot',
            {
              screen: 'PsbtWithHardwareWallet',
              params: {
                deepLinkPSBT: file,
              },
            },
          ]);
        }
      })
      .catch(e => console.warn(e));
    return;
  } else if (isPossiblyCosignerFile(url)) {
    readFileOutsideSandbox(decodeURI(url))
      .then(file => {
        // checks whether the necessary json keys are present in order to set a cosigner,
        // doesn't validate the values this happens later
        if (!file || !hasNeededJsonKeysForMultiSigSharing(file)) {
          return;
        }
        context.setSharedCosigner(file);
      })
      .catch(e => console.warn(e));
  }
  let bothBitcoinAndLightning: TBothBitcoinAndLightning;
  try {
    bothBitcoinAndLightning = isBothBitcoinAndLightningUrl(url);
  } catch (e) {
    console.log(e);
  }
  if (bothBitcoinAndLightning) {
    completionHandler([
      'SelectWallet',
      {
        onWalletSelect: (wallet: TWallet, { navigation }: any) => {
          navigation.pop(); // close select wallet screen
          navigation.navigate('ScanLNDInvoice', {
            uri: event.url.replace('lightning:', '').replace('LIGHTNING:', ''),
          });
        },
      },
    ]);
  } else if (Lnurl.isLightningAddress(event.url)) {
    // this might be not just an email but a lightning address
    // @see https://lightningaddress.com
    completionHandler([
      'ScanLNDInvoiceRoot',
      {
        screen: 'ScanLNDInvoice',
        params: {
          uri: event.url,
        },
      },
    ]);
  } else if (Azteco.isRedeemUrl(event.url)) {
    completionHandler([
      'AztecoRedeemRoot',
      {
        screen: 'AztecoRedeem',
        params: Azteco.getParamsFromUrl(event.url),
      },
    ]);
  } else if (new WatchOnlyWallet().setSecret(event.url).init().valid()) {
    completionHandler([
      'AddWalletRoot',
      {
        screen: 'ImportWallet',
        params: {
          triggerImport: true,
          label: event.url,
        },
      },
    ]);
  } else {
    const urlObject = parseUrl(event.url, true);
    (async () => {
      if (urlObject.protocol === 'bluewallet:' || urlObject.protocol === 'lapp:' || urlObject.protocol === 'blue:') {
        switch (urlObject.host) {
          case 'setelectrumserver':
            completionHandler([
              'ElectrumSettings',
              {
                server: getServerFromSetElectrumServerAction(event.url),
              },
            ]);
            break;
          case 'setlndhuburl':
            completionHandler([
              'LightningSettings',
              {
                url: getUrlFromSetLndhubUrlAction(event.url),
              },
            ]);
            break;
        }
      }
    })();
  }
};

// ========================================
// Notification handling types and functions
// ========================================

/**
 * Notification payload type definition
 */
export type TNotificationPayload = {
  type: number;
  address?: string;
  txid?: string;
  hash?: string;
  foreground?: boolean;
  userInteraction?: boolean;
  subText?: string;
  message?: string | object;
};

/**
 * Get navigation action for a notification payload
 */
export const getNavigationForNotification = (notification: TNotificationPayload, wallets: TWallet[]) => {
  const { type, address, txid, hash } = notification;
  
  if (type === 2 || type === 3) {
    // Address-based notifications (types 2 and 3)
    if (address) {
      // Find wallet by checking if address belongs to it
      const wallet = wallets.find(w => {
        try {
          // Check if wallet has address checking methods (HD wallets)
          if ('_getExternalAddressByIndex' in w && typeof w._getExternalAddressByIndex === 'function') {
            for (let i = 0; i < 100; i++) {
              try {
                if ((w as any)._getExternalAddressByIndex(i) === address) return true;
              } catch (e) {
                // Continue checking
              }
            }
          }
          if ('_getInternalAddressByIndex' in w && typeof w._getInternalAddressByIndex === 'function') {
            for (let i = 0; i < 100; i++) {
              try {
                if ((w as any)._getInternalAddressByIndex(i) === address) return true;
              } catch (e) {
                // Continue checking
              }
            }
          }
          
          // For simpler wallets, check the main address
          if ('getAddress' in w && typeof w.getAddress === 'function') {
            try {
              if ((w as any).getAddress() === address) return true;
            } catch (e) {
              // Continue checking
            }
          }
        } catch (error) {
          console.log('Error checking wallet addresses:', error);
        }
        return false;
      });
      
      if (wallet) {
        return {
          name: 'WalletTransactions' as const,
          params: {
            walletID: wallet.getID(),
            walletType: wallet.type,
          },
        };
      }
    }
  } else if (type === 1 || type === 4) {
    // Transaction-based notifications (types 1 and 4)
    const transactionId = txid || hash;
    if (transactionId) {
      const wallet = wallets.find(w => {
        try {
          const transactions = w.getTransactions();
          return transactions.some((tx: any) => tx.hash === transactionId || tx.txid === transactionId);
        } catch (error) {
          console.log('Error checking wallet transactions:', error);
          return false;
        }
      });
      
      if (wallet) {
        return {
          name: 'TransactionDetails' as const,
          params: {
            hash: transactionId,
            walletID: wallet.getID(),
          },
        };
      }
    }
  }
  
  // Fallback to wallet list if no specific wallet found
  return {
    name: 'UnlockWithScreenRoot' as const,
    params: {},
  };
};

/**
 * Process notifications with centralized navigation logic
 */
export const processNotificationsWithNavigation = async (
  notifications: TNotificationPayload[],
  wallets: TWallet[],
  navigateCallback: (action: any) => void,
) => {
  console.log('🔔 Processing notifications with centralized navigation:', notifications.length, 'notifications');
  
  // Process the most recent notification for navigation
  if (notifications.length > 0) {
    const mostRecentNotification = notifications[notifications.length - 1];
    console.log('🔔 Processing most recent notification:', mostRecentNotification);
    
    const navigationAction = getNavigationForNotification(mostRecentNotification, wallets);
    console.log('🔔 Navigation action:', navigationAction);
    
    if (navigationAction) {
      navigateCallback(navigationAction);
    }
  }
};

/**
 * Get React Navigation state object for a notification payload
 */
export const getNavigationStateForNotification = (notification: TNotificationPayload, wallets: TWallet[]) => {
  const navigationAction = getNavigationForNotification(notification, wallets);
  
  if (navigationAction.name === 'WalletTransactions') {
    return {
      routes: [
        { name: 'UnlockWithScreenRoot' },
        {
          name: 'WalletTransactions',
          params: navigationAction.params,
        },
      ],
      index: 1,
    };
  } else if (navigationAction.name === 'TransactionDetails') {
    return {
      routes: [
        { name: 'UnlockWithScreenRoot' },
        {
          name: 'TransactionDetails',
          params: navigationAction.params,
        },
      ],
      index: 1,
    };
  }
  
  // Default to unlock screen
  return {
    routes: [{ name: 'UnlockWithScreenRoot' }],
    index: 0,
  };
};

export default LinkingConfig;
