import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueLoading, SafeBlueArea, BlueButton, BlueDismissKeyboardInputAccessory, BlueSpacing20, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import BigNumber from 'bignumber.js';
import AddressInput from '../../components/AddressInput';
import AmountInput from '../../components/AmountInput';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc from '../../loc';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AbstractWallet, HDSegwitBech32Wallet, LightningLdkWallet } from '../../class';
import { ArrowPicker } from '../../components/ArrowPicker';
import { Psbt } from 'bitcoinjs-lib';
import Biometric from '../../class/biometrics';
import alert from '../../components/Alert';
const currency = require('../../blue_modules/currency');

type LdkOpenChannelProps = RouteProp<
  {
    params: {
      isPrivateChannel: boolean;
      psbt: Psbt;
      fundingWalletID: string;
      ldkWalletID: string;
      remoteHostWithPubkey: string;
    };
  },
  'params'
>;

const LdkOpenChannel = (props: any) => {
  const { wallets, fetchAndSaveWalletTransactions } = useContext(BlueStorageContext);
  const [isBiometricUseCapableAndEnabled, setIsBiometricUseCapableAndEnabled] = useState(false);
  const { colors }: { colors: any } = useTheme();
  const { navigate, setParams } = useNavigation();
  const {
    fundingWalletID,
    isPrivateChannel,
    ldkWalletID,
    psbt,
    remoteHostWithPubkey = '030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f@52.50.244.44:9735' /* Bitrefill */,
  } = useRoute<LdkOpenChannelProps>().params;
  const fundingWallet: HDSegwitBech32Wallet = wallets.find((w: AbstractWallet) => w.getID() === fundingWalletID);
  const ldkWallet: LightningLdkWallet = wallets.find((w: AbstractWallet) => w.getID() === ldkWalletID);
  const [unit, setUnit] = useState<BitcoinUnit | string>(ldkWallet.getPreferredBalanceUnit());
  const [isLoading, setIsLoading] = useState(false);
  const psbtOpenChannelStartedTs = useRef<number>();
  const name = useRoute().name;
  const [fundingAmount, setFundingAmount] = useState<any>({ amount: null, amountSats: null });
  const [verified, setVerified] = useState(false);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    valueText: {
      color: colors.alternativeTextColor2,
    },
    valueRoot: {
      backgroundColor: colors.background,
    },
    valueSats: {
      color: colors.alternativeTextColor2,
    },
    paidMark: {
      backgroundColor: colors.success,
    },
    detailsText: {
      color: colors.alternativeTextColor,
    },
    expired: {
      backgroundColor: colors.success,
    },
    additionalInfo: {
      backgroundColor: colors.brandingColor,
    },
  });

  /**
   * Handles when user navigates back from transaction creation flow and has PSBT object
   */
  useEffect(() => {
    if (!psbt) return;
    (async () => {
      if (psbtOpenChannelStartedTs.current ? +new Date() - psbtOpenChannelStartedTs.current >= 5 * 60 * 1000 : false) {
        // its 10 min actually, but lets check 5 min just for any case
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return alert('Channel opening expired. Please try again');
      }

      setVerified(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psbt]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Biometric.isBiometricUseCapableAndEnabled().then(setIsBiometricUseCapableAndEnabled);
  }, []);

  const finalizeOpenChannel = async () => {
    setIsLoading(true);
    if (isBiometricUseCapableAndEnabled) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!(await Biometric.unlockWithBiometrics())) {
        setIsLoading(false);
        return;
      }
    }
    if (psbtOpenChannelStartedTs.current ? +new Date() - psbtOpenChannelStartedTs.current >= 5 * 60 * 1000 : false) {
      // its 10 min actually, but lets check 5 min just for any case
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setIsLoading(false);
      return alert('Channel opening expired. Please try again');
    }

    const tx = psbt.extractTransaction();
    const res = await ldkWallet.fundingStateStepFinalize(tx.toHex()); // comment this out to debug
    // const res = true; // debug
    if (!res) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setIsLoading(false);
      return alert('Something wend wrong during opening channel tx broadcast');
    }
    fetchAndSaveWalletTransactions(ldkWallet.getID());
    await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
    fetchAndSaveWalletTransactions(fundingWalletID);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    navigate('Success', { amount: undefined });
    setIsLoading(false);
  };

  const openChannel = async () => {
    setIsLoading(true);
    try {
      const amountSatsNumber = new BigNumber(fundingAmount.amountSats).toNumber();
      if (!amountSatsNumber) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return alert('Amount is not valid');
      }

      const pubkey = remoteHostWithPubkey.split('@')[0];
      const host = remoteHostWithPubkey.split('@')[1];
      if (!pubkey || !host) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return alert('Remote node address is not valid');
      }

      const fundingAddressTemp = await ldkWallet.openChannel(pubkey, host, fundingAmount.amountSats, isPrivateChannel);
      console.warn('initiated channel opening');

      if (!fundingAddressTemp) {
        let reason = '';
        const channelsClosed = ldkWallet.getChannelsClosedEvents();
        const event = channelsClosed.pop();
        if (event) {
          reason += event.reason + ' ' + event.text;
        }
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return alert('Initiating channel open failed: ' + reason);
      }

      psbtOpenChannelStartedTs.current = +new Date();
      navigate('SendDetailsRoot', {
        screen: 'SendDetails',
        params: {
          memo: 'open channel',
          address: fundingAddressTemp,
          walletID: fundingWalletID,
          amount: fundingAmount.amount,
          amountSats: fundingAmount.amountSats,
          unit,
          noRbf: true,
          launchedBy: name,
          isEditable: false,
        },
      });
    } catch (error: any) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onBarScanned = (ret: { data?: any }) => {
    if (!ret.data) ret = { data: ret };
    setParams({ remoteHostWithPubkey: ret.data });
  };

  const render = () => {
    if (isLoading || !ldkWallet || !fundingWallet) {
      return (
        <View style={[styles.root, styles.justifyContentCenter, stylesHook.root]}>
          <BlueLoading style={{}} />
        </View>
      );
    }

    if (verified) {
      return (
        <View style={[styles.activeRoot, stylesHook.root]}>
          <BlueText>
            {loc.formatString(loc.lnd.opening_channnel_for_from, {
              forWalletLabel: ldkWallet.getLabel(),
              fromWalletLabel: fundingWallet.getLabel(),
            })}
          </BlueText>

          <BlueText>{loc.lnd.are_you_sure_open_channel}</BlueText>
          <BlueSpacing20 />
          <View style={styles.horizontalButtons}>
            <BlueButton onPress={finalizeOpenChannel} title={loc._.continue} />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.activeRoot, stylesHook.root]}>
        <BlueText>
          {loc.formatString(loc.lnd.opening_channnel_for_from, {
            forWalletLabel: ldkWallet.getLabel(),
            fromWalletLabel: fundingWallet.getLabel(),
          })}
        </BlueText>
        <AmountInput
          placeholder={loc.lnd.funding_amount_placeholder}
          isLoading={isLoading}
          amount={fundingAmount.amount}
          onAmountUnitChange={(newUnit: string) => {
            let amountSats = fundingAmount.amountSats;
            switch (newUnit) {
              case BitcoinUnit.SATS:
                amountSats = parseInt(fundingAmount.amount);
                break;
              case BitcoinUnit.BTC:
                amountSats = currency.btcToSatoshi(fundingAmount.amount);
                break;
              case BitcoinUnit.LOCAL_CURRENCY:
                // also accounting for cached fiat->sat conversion to avoid rounding error
                amountSats = currency.btcToSatoshi(currency.fiatToBTC(fundingAmount.amount));
                break;
            }
            setFundingAmount({ amount: fundingAmount.amount, amountSats });
            setUnit(newUnit);
          }}
          onChangeText={(text: string) => {
            let amountSats = fundingAmount.amountSats;
            switch (unit) {
              case BitcoinUnit.BTC:
                amountSats = currency.btcToSatoshi(text);
                break;
              case BitcoinUnit.LOCAL_CURRENCY:
                amountSats = currency.btcToSatoshi(currency.fiatToBTC(text));
                break;
              case BitcoinUnit.SATS:
                amountSats = parseInt(text);
                break;
            }
            setFundingAmount({ amount: text, amountSats });
          }}
          unit={unit}
          inputAccessoryViewID={(BlueDismissKeyboardInputAccessory as any).InputAccessoryViewID}
        />

        <AddressInput
          placeholder={loc.lnd.remote_host}
          address={remoteHostWithPubkey}
          isLoading={isLoading}
          inputAccessoryViewID={(BlueDismissKeyboardInputAccessory as any).InputAccessoryViewID}
          onChangeText={text => setParams({ remoteHostWithPubkey: text })}
          onBarScanned={onBarScanned}
          launchedBy={name}
        />
        <BlueDismissKeyboardInputAccessory />

        <ArrowPicker
          onChange={newKey => {
            const nodes = LightningLdkWallet.getPredefinedNodes();
            if (nodes[newKey]) setParams({ remoteHostWithPubkey: nodes[newKey] });
          }}
          items={LightningLdkWallet.getPredefinedNodes()}
          isItemUnknown={!Object.values(LightningLdkWallet.getPredefinedNodes()).some(node => node === remoteHostWithPubkey)}
        />
        <BlueSpacing20 />
        <View style={styles.horizontalButtons}>
          <BlueButton onPress={openChannel} disabled={remoteHostWithPubkey.length === 0} title={loc.lnd.open_channel} />
        </View>
      </View>
    );
  };

  return (
    <SafeBlueArea styles={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="default" />
      {render()}
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainerStyle: {
    flexGrow: 1,
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },
  qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
  valueAmount: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  horizontalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 32,
    fontWeight: '600',
  },
  valueSats: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 3,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  memo: {
    color: '#9aa0aa',
    fontSize: 14,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '400',
    alignSelf: 'center',
  },
  paid: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidMark: {
    marginTop: -100,
    marginBottom: 16,
  },
  detailsRoot: {
    justifyContent: 'flex-end',
    marginBottom: 24,
    alignItems: 'center',
  },
  detailsTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    marginRight: 8,
  },
  expired: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  activeRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  activeQrcode: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    borderWidth: 6,
    borderRadius: 8,
    borderColor: '#FFFFFF',
  },
});

LdkOpenChannel.navigationOptions = navigationStyle(
  {
    closeButton: true,
    closeButtonFunc: ({ navigation }) => navigation.dangerouslyGetParent().pop(),
  },
  (options, { theme, navigation, route }) => {
    return {
      ...options,
      headerTitle: loc.lnd.new_channel,
      headerLargeTitle: true,
    };
  },
);

export default LdkOpenChannel;
