/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import {
  BlueLoading,
  SafeBlueArea,
  BlueButton,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueDismissKeyboardInputAccessory,
  BlueSpacing20,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import BigNumber from 'bignumber.js';
import AddressInput from '../../components/AddressInput';
import AmountInput from '../../components/AmountInput';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc from '../../loc';
import PropTypes from 'prop-types';
import { SuccessView } from '../send/success';
const currency = require('../../blue_modules/currency');

const LndOpenChannel = props => {
  const {
    fundingWalletID,
    lndWalletID,
    isPrivateChannel,
    closeContainerModal,
    psbt,
    onPendingChanIdTempChange,
    pendingChanId,
    onPsbtOpenChannelStartedTsChange,
    psbtOpenChannelStartedTs,
    openOpenChannelSuccess,
  } = props;
  const { wallets, fetchAndSaveWalletTransactions } = useContext(BlueStorageContext);
  /** @type {LightningLndWallet} */
  const lndWallet = wallets.find(w => w.getID() === lndWalletID);
  /** @type {HDSegwitBech32Wallet} */
  const fundingWallet = wallets.find(w => w.getID() === fundingWalletID);
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const name = useRoute().name;

  const [remoteHostWithPubkey, setRemote] = useState(
    // '02e89ca9e8da72b33d896bae51d20e7e6675aa971f7557500b6591b15429e717f1@165.227.95.104:9735' // lnd1.bluewallet.io
    '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f@34.239.230.56:9735', // ACINQ
  );
  const [verified, setVerified] = useState(false);
  const [unit, setUnit] = useState(fundingWallet.getPreferredBalanceUnit());
  const [fundingAmount, setFundingAmount] = useState({ amount: null, amountSats: null });
  const [isOpenChannelSuccessful, setIsOpenChannelSuccessful] = useState(false);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
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

  const base64ToHex = base64 => {
    return Buffer.from(base64, 'base64').toString('hex');
  };

  /**
   * Handles when user navigates back from transaction creation flow and has PSBT object
   */
  useEffect(() => {
    if (!psbt) return;
    (async () => {
      if (+new Date() - psbtOpenChannelStartedTs >= 5 * 60 * 1000) {
        // its 10 min actually, but lets check 5 min just for any case
        return alert('Channel opening expired. Please try again');
      }

      const chanIdHex = base64ToHex(pendingChanId);
      const psbtHex = psbt.toHex();
      try {
        const verifiedResult = await lndWallet.fundingStateStepVerify(chanIdHex, psbtHex);
        setVerified(verifiedResult);
        if (!verifiedResult) {
          alert('Something went wrong with PSBT for LND');
        }
      } catch (error) {
        alert(error.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psbt]);

  const finalizeOpenChannel = async () => {
    if (+new Date() - psbtOpenChannelStartedTs >= 5 * 60 * 1000) {
      // its 10 min actually, but lets check 5 min just for any case
      return alert('Channel opening expired. Please try again');
    }

    /** @type {LightningLndWallet} */
    const w = lndWallet;

    const chanIdHex = base64ToHex(pendingChanId);
    const psbtHex = psbt.toHex();
    const res = await w.fundingStateStepFinalize(chanIdHex, psbtHex); // comment this out to debug
    // const res = true; // debug
    if (!res) {
      return alert('Something wend wrong during opening channel tx broadcast');
    }
    fetchAndSaveWalletTransactions(w.getID());
    setIsOpenChannelSuccessful(true);
  };

  const openChannel = async () => {
    setIsLoading(true);
    try {
      const amountSatsNumber = new BigNumber(fundingAmount.amountSats).toNumber();
      if (!amountSatsNumber) {
        return alert('Amount is not valid');
      }

      const pubkey = remoteHostWithPubkey.split('@')[0];
      const host = remoteHostWithPubkey.split('@')[1];
      if (!pubkey || !host) {
        return alert('Remote node address is not valid');
      }

      if (pendingChanId) {
        // channel opening in progress, so we need to cancel it first
        console.log('canceling funding intention for channel id', pendingChanId);
        const chanIdHex = base64ToHex(pendingChanId);
        await lndWallet.fundingStateStepCancel(chanIdHex);
      }

      const openChannelData = await lndWallet.openChannel(pubkey, host, fundingAmount.amountSats, isPrivateChannel);
      console.warn('got open channel data:', openChannelData);
      const pendingChanIdTemp = openChannelData?.pendingChanId;
      const fundingAddressTemp = openChannelData?.psbtFund?.fundingAddress;
      const fundingAmountTemp = openChannelData?.psbtFund?.fundingAmount;

      if (!pendingChanIdTemp || !fundingAddressTemp || !fundingAmountTemp) {
        return alert('Initiating channel open failed');
      }

      onPendingChanIdTempChange(pendingChanIdTemp);
      onPsbtOpenChannelStartedTsChange(+new Date());
      closeContainerModal();
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
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onBarScanned = ret => {
    if (!ret.data) ret = { data: ret };
    setRemote(ret.data);
  };

  const render = () => {
    if (isLoading || !lndWallet || !fundingWallet) {
      return (
        <View style={[styles.root, styles.justifyContentCenter, stylesHook.root]}>
          <BlueLoading style={{}} />
        </View>
      );
    }

    if (verified) {
      return (
        <View style={[styles.activeRoot, stylesHook.root]}>
          <Text>
            Opening channel for wallet {lndWallet.getLabel()}, funding from {fundingWallet.getLabel()}
          </Text>

          <Text>All seems to be in order. Are you sure you want to open this channel?</Text>

          <BlueButton onPress={finalizeOpenChannel} title="Yes, Open Channel" />
        </View>
      );
    }

    if (isOpenChannelSuccessful) {
      return (
        <View style={[styles.activeRoot, stylesHook.root]}>
          <SuccessView />
          <BlueButton onPress={openOpenChannelSuccess} title={loc.send.success_done} />
        </View>
      );
    }

    return (
      <View style={[styles.activeRoot, stylesHook.root]}>
        <Text>
          Opening channel for {lndWallet.getLabel()}, funding from {fundingWallet.getLabel()}
        </Text>
        <AmountInput
          placeholder="funding amount, for exampe 0.001"
          isLoading={isLoading}
          amount={fundingAmount.amount}
          onAmountUnitChange={newUnit => {
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
            setFundingAmount(currentFundingAmount => {
              return { amount: currentFundingAmount.amount, amountSats };
            });
            setUnit(newUnit);
          }}
          onChangeText={text => {
            let amountSats = fundingAmount.amountSats;
            switch (unit) {
              case BitcoinUnit.BTC:
                amountSats = currency.btcToSatoshi(text);
                break;
              case BitcoinUnit.LOCAL_CURRENCY:
                amountSats = currency.btcToSatoshi(currency.fiatToBTC(text));
                break;
              default:
              case BitcoinUnit.SATS:
                amountSats = parseInt(text);
                break;
            }
            setFundingAmount({ amount: text, amountSats });
          }}
          unit={unit}
          inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
        />

        <AddressInput
          placeholder={loc.lnd.remote_host}
          address={remoteHostWithPubkey}
          isLoading={isLoading}
          inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
          onChangeText={setRemote}
          onBarScanned={onBarScanned}
          launchedBy={name}
        />
        <BlueSpacing20 />
        <BlueButton onPress={openChannel} title="Open Channel" />
        <BlueDoneAndDismissKeyboardInputAccessory />
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

LndOpenChannel.propTypes = {
  fundingWalletID: PropTypes.string.isRequired,
  lndWalletID: PropTypes.string.isRequired,
  isPrivateChannel: PropTypes.bool.isRequired,
  closeContainerModal: PropTypes.func,
  psbt: PropTypes.string,
  onPendingChanIdTempChange: PropTypes.func,
  pendingChanId: PropTypes.string,
  onPsbtOpenChannelStartedTsChange: PropTypes.func,
  psbtOpenChannelStartedTs: PropTypes.string,
  openOpenChannelSuccess: PropTypes.func,
};

LndOpenChannel.navigationOptions = navigationStyle(
  {
    title: '',
    closeButton: true,
    closeButtonFunc: ({ navigation }) => navigation.dangerouslyGetParent().pop(),
  },
  (options, { theme, navigation, route }) => {
    const additionalOptions =
      route.params.isModal === true
        ? {
            headerLeft: null,
            gestureEnabled: false,
          }
        : {
            headerRight: null,
          };

    return {
      ...options,
      ...additionalOptions,
    };
  },
);

export default LndOpenChannel;
