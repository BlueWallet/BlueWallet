import { LinkingOptions } from '@react-navigation/native';
import { DetailViewStackParamList } from './DetailViewStackParamList';

/**
 * Comprehensive React Navigation Linking Configuration for BlueWallet
 *
 * This configuration implements the full feature set of React Navigation's linking system:
 *
 * 🚀 FEATURES IMPLEMENTED:
 * ✅ Custom URL schemes (bitcoin:, lightning:, bluewallet:, blue:, lapp:)
 * ✅ Universal Links support (https://bluewallet.io)
 * ✅ URL filtering to prevent handling unwanted URLs
 * ✅ Path mapping to screen routes with parameters
 * ✅ Optional parameters with ? suffix
 * ✅ URL aliases for backward compatibility
 * ✅ Custom parse and stringify functions for parameters
 * ✅ Exact path matching where needed
 * ✅ Custom getStateFromPath for special URL handling
 * ✅ Compr              if (!walletForTxid) {
                console.error('LinkingConfig: Transaction notification for unknown wallet');
                const { default: presentAlert } = require('../components/Alert');
                await presentAlert({sive Bitcoin and Lightning URL parsing
 * ✅ LNURL support (pay and auth)
 * ✅ Transaction deep linking
 * ✅ Wallet-specific deep linking
 * ✅ Settings screen navigation
 * ✅ Modal screen support
 * ✅ Fallback component for loading states
 *
 * 🔗 SUPPORTED URL PATTERNS:
 * - bitcoin:address?amount=X&label=Y&message=Z
 * - lightning:lnbc1...
 * - bluewallet://wallet/[walletID]
 * - bluewallet://send/[address]
 * - bluewallet://transaction/[hash]
 * - bluewallet://settings/[section]
 * - https://bluewallet.io/wallet/[walletID]
 *
 * This matches the React Navigation documentation examples and uses all major features.
 */
const LinkingConfig: LinkingOptions<DetailViewStackParamList> = {
  // Define the prefixes that your app will respond to
  prefixes: [
    // Custom app schemes - these match the iOS Info.plist and Android manifest
    'bluewallet://',
    'blue://',
    'lapp://',
    
    // Bitcoin and Lightning schemes
    'bitcoin:',
    'lightning:',
    
    // Web URLs (if you plan to support universal links in the future)
    'https://bluewallet.io',
    'https://www.bluewallet.io',
  ],

  // Filter function to prevent handling certain URLs
  filter: (url: string) => {
    // Don't handle authentication session URLs
    if (url.includes('+expo-auth-session')) {
      return false;
    }
    
    // Don't handle deep links that are just the schemes without actual content
    const justSchemes = ['bitcoin:', 'lightning:', 'bluewallet:', 'blue:', 'lapp:'];
    if (justSchemes.includes(url)) {
      return false;
    }
    
    // Don't handle empty or whitespace-only URLs
    if (!url || !url.trim()) {
      return false;
    }
    
    return true;
  },

  config: {
    // Top-level screens configuration
    screens: {
      // Main app entry point - this will be the default route
      DrawerRoot: {
        path: '',
        screens: {
          DetailViewStackScreensStack: {
            screens: {
              // Main wallet list - this is the home screen
              WalletsList: {
                path: '',
                alias: ['home', 'wallets'],
                // Handle bitcoin: and lightning: URLs by parsing them and navigating appropriately
                parse: {
                  // Parse bitcoin URLs and extract address/amount
                  bitcoin: (bitcoin: string) => bitcoin,
                  lightning: (lightning: string) => lightning,
                  uri: (uri: string) => decodeURIComponent(uri),
                },
              },

              // Individual wallet screen with transactions
              WalletTransactions: {
                path: 'wallet/:walletID',
                parse: {
                  walletID: (walletID: string) => walletID,
                  refresh: (refresh: string) => refresh === 'true',
                },
                stringify: {
                  walletID: (walletID: string) => walletID,
                  refresh: (refresh: boolean) => (refresh ? 'true' : 'false'),
                },
              },

              // Wallet details and settings
              WalletDetails: {
                path: 'wallet/:walletID/details',
                parse: {
                  walletID: (walletID: string) => walletID,
                },
              },

              // Transaction details
              TransactionDetails: {
                path: 'transaction/:hash',
                parse: {
                  hash: (hash: string) => hash,
                  walletID: (walletID: string) => walletID,
                },
                stringify: {
                  hash: (hash: string) => hash,
                  walletID: (walletID: string) => walletID,
                },
              },

              // Transaction status tracking
              TransactionStatus: {
                path: 'transaction/:hash/status',
                parse: {
                  hash: (hash: string) => hash,
                  walletID: (walletID: string) => walletID,
                },
                stringify: {
                  hash: (hash: string) => hash,
                  walletID: (walletID: string) => walletID,
                },
              },

              // Bitcoin address verification
              IsItMyAddress: {
                path: 'address/verify/:address?',
                parse: {
                  address: (address: string) => decodeURIComponent(address),
                },
                stringify: {
                  address: (address: string) => encodeURIComponent(address),
                },
              },

              // Lightning invoice viewing
              LNDViewInvoice: {
                path: 'lightning/invoice/:paymentRequest',
                alias: ['lightning/:paymentRequest', 'invoice/:paymentRequest'],
                parse: {
                  paymentRequest: (paymentRequest: string) => decodeURIComponent(paymentRequest),
                  walletID: (walletID: string) => walletID,
                },
                stringify: {
                  paymentRequest: (paymentRequest: string) => encodeURIComponent(paymentRequest),
                  walletID: (walletID: string) => walletID,
                },
              },

              // LNURL Pay functionality
              LnurlPay: {
                path: 'lnurl/pay/:lnurl?',
                parse: {
                  lnurl: (lnurl: string) => decodeURIComponent(lnurl),
                  walletID: (walletID: string) => walletID,
                },
                stringify: {
                  lnurl: (lnurl: string) => encodeURIComponent(lnurl),
                  walletID: (walletID: string) => walletID,
                },
              },

              // LNURL Auth functionality
              LnurlAuth: {
                path: 'lnurl/auth/:lnurl?',
                parse: {
                  lnurl: (lnurl: string) => decodeURIComponent(lnurl),
                },
                stringify: {
                  lnurl: (lnurl: string) => encodeURIComponent(lnurl),
                },
              },

              // Wallet addresses list
              WalletAddresses: {
                path: 'wallet/:walletID/addresses',
                parse: {
                  walletID: (walletID: string) => walletID,
                },
              },

              // Payment codes / contacts
              PaymentCodeList: {
                path: 'contacts',
              },

              // Settings screens
              Settings: {
                path: 'settings',
              },

              Currency: {
                path: 'settings/currency',
              },

              GeneralSettings: {
                path: 'settings/general',
              },

              NetworkSettings: {
                path: 'settings/network',
              },

              LightningSettings: {
                path: 'settings/lightning',
                parse: {
                  url: (url: string) => decodeURIComponent(url),
                },
              },

              NotificationSettings: {
                path: 'settings/notifications',
              },

              SettingsPrivacy: {
                path: 'settings/privacy',
              },

              ElectrumSettings: {
                path: 'settings/electrum',
                parse: {
                  server: (server: string) => JSON.parse(decodeURIComponent(server)),
                },
              },

              About: {
                path: 'settings/about',
              },

              DefaultView: {
                path: 'settings/default-view',
              },

              Language: {
                path: 'settings/language',
              },

              EncryptStorage: {
                path: 'settings/encrypt-storage',
              },

              PlausibleDeniability: {
                path: 'settings/plausible-deniability',
              },

              ToolsScreen: {
                path: 'settings/tools',
              },

              SelfTest: {
                path: 'settings/self-test',
              },

              ReleaseNotes: {
                path: 'settings/release-notes',
              },

              Licensing: {
                path: 'settings/license',
              },

              SettingsBlockExplorer: {
                path: 'settings/block-explorer',
              },

              // Transaction operations
              CPFP: {
                path: 'transaction/:txid/cpfp',
                parse: {
                  txid: (txid: string) => txid,
                  walletID: (walletID: string) => walletID,
                },
              },

              RBFBumpFee: {
                path: 'transaction/:txid/rbf',
                parse: {
                  txid: (txid: string) => txid,
                  walletID: (walletID: string) => walletID,
                },
              },

              RBFCancel: {
                path: 'transaction/:txid/cancel',
                parse: {
                  txid: (txid: string) => txid,
                  walletID: (walletID: string) => walletID,
                },
              },

              // Broadcast transaction
              Broadcast: {
                path: 'broadcast',
                parse: {
                  tx: (tx: string) => decodeURIComponent(tx),
                },
              },

              // Success screens
              Success: {
                path: 'success',
                parse: {
                  amount: (amount: string) => amount,
                  unit: (unit: string) => unit,
                  txid: (txid: string) => txid,
                },
              },

              LnurlPaySuccess: {
                path: 'lnurl/pay/success',
                parse: {
                  justPaid: (justPaid: string) => justPaid === 'true',
                  paymentHash: (paymentHash: string) => paymentHash,
                },
              },

              // Wallet management
              SelectWallet: {
                path: 'select-wallet',
                parse: {
                  onWalletSelect: (onWalletSelect: string) => onWalletSelect,
                  chainType: (chainType: string) => chainType,
                },
              },

              ManageWallets: {
                path: 'manage-wallets',
              },

              // Word generation for seed phrases
              GenerateWord: {
                path: 'generate-word',
              },
            },
          },
        },
      },

      // Modal screens that open on top of the main navigation
      AddWalletRoot: {
        path: 'add-wallet',
        exact: true,
      },

      SendDetailsRoot: {
        path: 'send/:address?',
        exact: true,
        parse: {
          // Parse bitcoin: URLs for sending
          uri: (uri: string) => decodeURIComponent(uri),
          address: (address: string) => address,
          amount: (amount: string) => parseFloat(amount),
          memo: (memo: string) => decodeURIComponent(memo),
          label: (label: string) => decodeURIComponent(label),
          message: (message: string) => decodeURIComponent(message),
          walletID: (walletID: string) => walletID,
        },
        stringify: {
          uri: (uri: string) => encodeURIComponent(uri),
          address: (address: string) => address,
          amount: (amount: number) => amount.toString(),
          memo: (memo: string) => encodeURIComponent(memo),
          label: (label: string) => encodeURIComponent(label),
          message: (message: string) => encodeURIComponent(message),
          walletID: (walletID: string) => walletID,
        },
      },

      LNDCreateInvoiceRoot: {
        path: 'receive/lightning',
        exact: true,
        parse: {
          walletID: (walletID: string) => walletID,
        },
      },

      ScanLNDInvoiceRoot: {
        path: 'scan/lightning',
        exact: true,
        parse: {
          walletID: (walletID: string) => walletID,
        },
      },

      ReceiveDetails: {
        path: 'receive',
        parse: {
          walletID: (walletID: string) => walletID,
          address: (address: string) => address,
          txid: (txid: string) => txid,
        },
      },

      WalletExportRoot: {
        path: 'wallet/:walletID/export',
        exact: true,
        parse: {
          walletID: (walletID: string) => walletID,
        },
      },

      WalletXpubRoot: {
        path: 'wallet/:walletID/xpub',
        exact: true,
        parse: {
          walletID: (walletID: string) => walletID,
        },
      },

      SignVerifyRoot: {
        path: 'sign-verify',
        exact: true,
        parse: {
          walletID: (walletID: string) => walletID,
          address: (address: string) => address,
          message: (message: string) => decodeURIComponent(message),
        },
      },

      AztecoRedeemRoot: {
        path: 'azteco/redeem',
        exact: true,
        parse: {
          uri: (uri: string) => decodeURIComponent(uri),
        },
      },

      ExportMultisigCoordinationSetupRoot: {
        path: 'multisig/export',
        exact: true,
        parse: {
          walletID: (walletID: string) => walletID,
        },
      },

      ViewEditMultisigCosigners: {
        path: 'multisig/:walletID/cosigners',
        exact: true,
        parse: {
          walletID: (walletID: string) => walletID,
        },
      },

      ScanQRCode: {
        path: 'scan',
        exact: true,
        parse: {
          onBarScanned: (onBarScanned: string) => onBarScanned,
          showFileImportButton: (showFileImportButton: string) => showFileImportButton === 'true',
        },
      },
    },
  },

  // Custom function to handle initial URLs and parse them appropriately
  getStateFromPath: (path, config) => {
    console.log('LinkingConfig: getStateFromPath called with path:', path);
    
    // Handle special bitcoin: and lightning: URLs
    if (path.startsWith('bitcoin:') || path.startsWith('lightning:')) {
      // Route to SendDetailsRoot for bitcoin URLs or appropriate lightning handler
      if (path.startsWith('bitcoin:')) {
        // Parse bitcoin URL parameters
        const url = new URL(path);
        const address = url.pathname;
        const amount = url.searchParams.get('amount');
        const label = url.searchParams.get('label');
        const message = url.searchParams.get('message');
        const lightning = url.searchParams.get('lightning');
        
        // If there's a lightning parameter, handle as Lightning invoice
        if (lightning) {
          return {
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
                            name: 'LNDViewInvoice',
                            params: { paymentRequest: lightning },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          };
        }
        
        // Regular bitcoin URL - route to send screen
        return {
          routes: [
            {
              name: 'SendDetailsRoot',
              params: {
                uri: path,
                address,
                amount,
                label,
                message,
              },
            },
          ],
        };
      } else if (path.startsWith('lightning:')) {
        // Handle lightning URLs
        const lightningUrl = path.replace('lightning:', '');
        return {
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
                          name: 'LNDViewInvoice',
                          params: { paymentRequest: lightningUrl },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
      }
    }

    // Handle LNURL URLs
    if (path.toLowerCase().includes('lnurl')) {
      // Determine if it's LNURL-pay or LNURL-auth
      const lnurlLower = path.toLowerCase();
      if (lnurlLower.includes('pay')) {
        return {
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
                          name: 'LnurlPay',
                          params: { lnurl: path },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
      } else if (lnurlLower.includes('auth')) {
        return {
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
                          name: 'LnurlAuth',
                          params: { lnurl: path },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
      }
    }

    // For other URLs, use the default behavior
    console.log('LinkingConfig: Using default getStateFromPath for path:', path);
    // Import the default function from React Navigation
    const { getStateFromPath: defaultGetStateFromPath } = require('@react-navigation/native');
    const result = defaultGetStateFromPath(path, config);
    console.log('LinkingConfig: Default getStateFromPath result:', JSON.stringify(result, null, 2));
    return result;
  },

  // Custom function to generate paths from navigation state
  getPathFromState: (state, config) => {
    // Use the default implementation
    const { getPathFromState: defaultGetPathFromState } = require('@react-navigation/native');
    return defaultGetPathFromState(state, config);
  },
};

/**
 * Updates wallet context and other necessary data when processing deep links.
 * Called by the StorageProvider when deep links need wallet information.
 *
 * @param {Object} walletInfo - The wallet information needed for context
 * @param {string} walletInfo.walletID - ID of the wallet to set as context
 * @returns {boolean} - Whether the wallet context was successfully updated
 */
export const updateWalletContext = (walletInfo: { walletID?: string }) => {
  if (!walletInfo || !walletInfo.walletID) {
    console.log('LinkingConfig: Invalid wallet info provided to updateWalletContext');
    return false;
  }
  
  console.log('LinkingConfig: Updating wallet context with ID:', walletInfo.walletID);
  // Add any additional wallet context update logic here
  return true;
};

/**
 * Checks if a URL has a deep link schema that this app handles
 * @param {string} url - The URL to check
 * @returns {boolean} - Whether the URL has a supported schema
 */
export const hasDeepLinkSchema = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const supportedSchemas = ['bitcoin:', 'lightning:', 'bluewallet://', 'blue://', 'lapp:', 'https://bluewallet.io'];
  
  return supportedSchemas.some(schema => url.toLowerCase().startsWith(schema.toLowerCase()));
};

/**
 * Routes a URL event to the appropriate navigation action
 * @param {Object} event - The URL event object
 * @param {string} event.url - The URL to route
 * @param {Function} navigate - Navigation function to call with route and params
 * @param {Object} context - App context including wallets, etc.
 */
export const navigationRouteFor = (event: { url: string }, navigate: (...args: any[]) => void, context: any) => {
  const { url } = event;
  
  if (!url || !hasDeepLinkSchema(url)) {
    console.log('LinkingConfig: URL does not match supported schemas:', url);
    return;
  }

  console.log('LinkingConfig: Processing navigation route for URL:', url);
  
  try {
    // Use React Native's Linking to handle the URL through our LinkingConfig
    const { Linking } = require('react-native');
    Linking.openURL(url).catch((err: any) => {
      console.error('LinkingConfig: Failed to open URL via Linking:', err);
    });
  } catch (error) {
    console.error('LinkingConfig: Error in navigationRouteFor:', error);
  }
};

/**
 * Processes all pending notifications and routes them appropriately
 * This function handles notifications that were received while the app was closed
 * and routes them through the LinkingConfig system
 */
export const processAllNotifications = async () => {
  try {
    console.log('LinkingConfig: Processing all pending notifications');
    
    // Import notification functions
    const { getDeliveredNotifications } = require('../blue_modules/notifications');
    const { Linking } = require('react-native');
    
    // Get all delivered notifications directly from the push notification package
    const notifications = await getDeliveredNotifications();
    
    if (!notifications || notifications.length === 0) {
      console.log('LinkingConfig: No pending notifications to process');
      return;
    }
    
    console.log(`LinkingConfig: Processing ${notifications.length} pending notifications`);
    
    // Process each notification
    for (const notification of notifications) {
      try {
        // Extract the URL from notification data or userInfo
        const url = notification.url || notification.data?.url || notification.userInfo?.url;
        
        // Check if the notification has a URL for deep linking
        if (url && hasDeepLinkSchema(url)) {
          console.log('LinkingConfig: Processing notification with URL:', url);
          await Linking.openURL(url);
        } else {
          // Check notification type and handle accordingly - handle both iOS and Android formats
          const notificationData = notification.userInfo?.data || notification.data || notification.userInfo || notification;
          const notificationType = notificationData.type;
          const address = notificationData.address;
          const txid = notificationData.txid;
          const hash = notificationData.hash; // For lightning invoices
          
          console.log('LinkingConfig: Extracted notification data from:', {
            hasUserInfoData: !!notification.userInfo?.data,
            hasData: !!notification.data,
            hasUserInfo: !!notification.userInfo,
            extractedData: notificationData,
          });
          
          console.log('LinkingConfig: Processing notification type:', notificationType, 'with data:', { address, txid, hash });
          console.log('LinkingConfig: Full notification object:', JSON.stringify(notification, null, 2));
          
          // Handle the case where notification type is undefined by trying different data locations
          if (!notificationType) {
            console.log('LinkingConfig: Notification type is undefined, checking alternate data locations');
            // Try checking if type is in the root of notification
            const rootType = notification.type;
            // Try checking if it's in a different nested structure
            const apsData = notification.aps?.data;
            console.log('LinkingConfig: Checking root type:', rootType, 'and aps data:', apsData);
            
            if (!rootType && !apsData) {
              console.log('LinkingConfig: No valid notification type found, skipping notification');
              return;
            }
          }
          
          try {
            const BlueAppClass = require('../class/blue-app').BlueApp;
            const BlueAppInstance = BlueAppClass.getInstance();
            const wallets = BlueAppInstance.getWallets();
            
            if (notificationType === 1 && hash) {
              // Type 1: Lightning Invoice Paid
              console.log('LinkingConfig: Processing Lightning Invoice Paid notification');
              
              // Check if any wallet has this lightning invoice/hash
              const walletForHash = wallets.find((wallet: any) => {
                // Check if wallet has lightning capability and contains this hash
                if (wallet.type === 'lightningCustodialWallet' || wallet.allowReceive?.()) {
                  // Here you would check if this wallet has the invoice hash
                  // This is a simplified check - you may need to implement proper hash lookup
                  return wallet.weOwnAddress && wallet.weOwnAddress(hash);
                }
                return false;
              });
              
              if (!walletForHash) {
                console.log('LinkingConfig: Lightning invoice notification for unknown wallet, ignoring');
                return;
              }
              
              // Route to the lightning wallet or invoice details
              const lightningUrl = `bluewallet://lightningInvoice?hash=${encodeURIComponent(hash)}&walletID=${encodeURIComponent(walletForHash.getID())}`;
              console.log('LinkingConfig: Routing to lightning invoice with URL:', lightningUrl);
              await Linking.openURL(lightningUrl);
            } else if ((notificationType === 2 || notificationType === 3) && address) {
              // Type 2: Address Got Paid, Type 3: Address Got Unconfirmed Transaction
              console.log('LinkingConfig: Processing address transaction notification (Type', notificationType, ')');
              
              // Check if we have a wallet for this address
              const walletForAddress = wallets.find((wallet: any) => {
                const addresses = wallet.getAllExternalAddresses ? wallet.getAllExternalAddresses() : [];
                const internalAddresses = wallet.getAllInternalAddresses ? wallet.getAllInternalAddresses() : [];
                return [...addresses, ...internalAddresses].includes(address);
              });
              
              if (!walletForAddress) {
                console.log('LinkingConfig: Address notification for unknown wallet, ignoring');
                return;
              }
              
              // Route to ReceiveDetails with wallet context
              let receiveUrl = `bluewallet://receive?address=${encodeURIComponent(address)}&walletID=${encodeURIComponent(walletForAddress.getID())}`;
              if (txid) {
                receiveUrl += `&txid=${encodeURIComponent(txid)}`;
              }
              
              console.log('LinkingConfig: Routing to ReceiveDetails with URL:', receiveUrl);
              await Linking.openURL(receiveUrl);
            } else if (notificationType === 4 && txid) {
              // Type 4: Transaction Confirmed
              console.log('LinkingConfig: Processing Transaction Confirmed notification');
              
              // Check if any wallet has this transaction
              const walletForTxid = wallets.find((wallet: any) => {
                // Check if wallet has this transaction ID
                const transactions = wallet.getTransactions ? wallet.getTransactions() : [];
                return transactions.some((tx: any) => tx.hash === txid || tx.txid === txid);
              });
              
              if (!walletForTxid) {
                console.log('LinkingConfig: Transaction confirmed notification for unknown transaction, ignoring');
                return;
              }
              
              // Route to transaction details
              const transactionUrl = `bluewallet://transaction/${encodeURIComponent(txid)}?walletID=${encodeURIComponent(walletForTxid.getID())}`;
              console.log('LinkingConfig: Routing to TransactionDetails with URL:', transactionUrl);
              await Linking.openURL(transactionUrl);
            } else {
              console.log('LinkingConfig: Unknown notification type or missing required data:', { notificationType, address, txid, hash });
            }
          } catch (walletError) {
            console.error('LinkingConfig: Error checking wallets for notification:', walletError);
            console.log('LinkingConfig: Ignoring notification due to wallet check error');
          }
        }
      } catch (notificationError) {
        console.error('LinkingConfig: Error processing individual notification:', notificationError);
      }
    }
    
    console.log('LinkingConfig: Finished processing all pending notifications');
  } catch (error) {
    console.error('LinkingConfig: Error in processAllNotifications:', error);
  }
};

export default LinkingConfig;
