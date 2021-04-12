/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import { View, StatusBar, BackHandler, StyleSheet, Text, FlatList, Keyboard, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import {
  BlueLoading,
  SafeBlueArea,
  BlueButton,
  BlueSpacing20,
  BlueSpacing40,
  BlueSpacing10,
  BlueCard,
  BlueListItem,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { Chain } from '../../models/bitcoinUnits';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import LNNodeBar from '../../components/LNNodeBar';
import BottomModal from '../../components/BottomModal';
import Button, { ButtonStyle } from '../../components/Button';

const selectWallet = require('../../helpers/select-wallet');
const confirm = require('../../helpers/confirm');

const LndInfo = () => {
  const { walletID, isModal } = useRoute().params;
  const { wallets } = useContext(BlueStorageContext);
  /** @type {LightningLndWallet} */
  const wallet = wallets.find(w => w.getID() === walletID);
  const { colors } = useTheme();
  const { goBack, setOptions, navigate } = useNavigation();
  const name = useRoute().name;
  const [isLoading, setIsLoading] = useState(true);
  const [isNewChannelModalVisible, setIsNewChannelModalVisible] = useState(false);
  const [info, setInfo] = useState('');
  const [channels, setChannels] = useState([]);
  const [wBalance, setWalletBalance] = useState({});
  const [getInfo, setGetInfo] = useState({});
  const [selectedChannelIndex, setSelectedChannelIndex] = useState();

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
    textHeader: {
      color: colors.outputValue,
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
    modalContent: {
      backgroundColor: colors.elevated,
    },
    separator: {
      backgroundColor: colors.inputBorderColor,
    },
  });

  const refetchData = async () => {
    const getInfo = await wallet.getInfo();
    const dir = await wallet.getLndDir();
    const peers = await wallet.listPeers();
    const pendingChannels = await wallet.pendingChannels();
    const listChannels = await wallet.listChannels();
    if (listChannels && listChannels.channels) setChannels(listChannels.channels);
    const txs = await wallet.getLndTransactions();
    const walletBalance = await wallet.walletBalance();
    setWalletBalance(walletBalance);
    setGetInfo(getInfo);

    setInfo('LND dir: ' + dir + '\n\nReceivable balance: ' + wallet.getReceivableBalance() + ' Sat');
    console.log(
      'walletBalance=' +
        JSON.stringify(walletBalance) +
        '\n\n' +
        JSON.stringify(getInfo) +
        '\n\n' +
        dir +
        '\n\n' +
        JSON.stringify(pendingChannels) +
        '\n\n' +
        JSON.stringify(listChannels) +
        '\n\ntxs= ' +
        JSON.stringify(txs) +
        '\n\n' +
        JSON.stringify(peers),
    );
    setIsLoading(false);
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    refetchData();
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions(
      isModal === true
        ? {
            headerStyle: {
              backgroundColor: colors.customHeader,
              borderBottomWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
              shadowOffset: { height: 0, width: 0 },
            },
            gestureEnabled: false,
          }
        : {
            headerStyle: {
              backgroundColor: colors.customHeader,
              borderBottomWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
              shadowOffset: { height: 0, width: 0 },
            },
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  const showModal = index => {
    setSelectedChannelIndex(index);
  };

  const closeChannel = async channel => {
    if (!(await confirm())) return;
    setSelectedChannelIndex(undefined);
    const fundingTxid = channel.channelPoint.split(':')[0];
    const fundingIndex = channel.channelPoint.split(':')[1];

    // first, handling case when we cant withdraw funds to specific addres because its hardcoded in channel details:
    if (channel?.closeAddress) {
      const rez = await wallet.closeChannel(channel.closeAddress, fundingTxid, +fundingIndex, false);
      if (rez && rez.closePending) {
        alert('Success!');
        return refetchData();
      }
      return;
    }

    /** @type {AbstractWallet} */
    const toWallet = await selectWallet(navigate, name, Chain.ONCHAIN, false, 'Onchain wallet is required to withdraw funds to');
    if (!toWallet) return;

    console.warn('want to close to wallet ', toWallet.getLabel());
    const address = await toWallet.getAddressAsync();
    if (!address) return alert('Error: could not get address for channel withdrawal');
    let forceClose = false;
    if (!channel.active) {
      if (!(await confirm('Force-close the channel?'))) return;
      forceClose = true;
    }
    const rez = await wallet.closeChannel(address, fundingTxid, +fundingIndex, forceClose);
    if (rez && rez.closePending) {
      alert('Success!');
      return refetchData();
    }
  };

  const claimBalance = async () => {
    const selectedWallet = await selectWallet(navigate, name, Chain.ONCHAIN, false);
    const address = await selectedWallet.getAddressAsync();
    if (await confirm()) {
      console.warn('selected ', selectedWallet.getLabel(), address);
      const rez = await wallet.claimCoins(address);
      if (rez && rez.txid) {
        alert('Success!');
        await refetchData();
      }
    }
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setSelectedChannelIndex(undefined);
    setIsNewChannelModalVisible(false);
  };

  const renderModal = (
    <BottomModal isVisible={selectedChannelIndex !== undefined} onClose={closeModal}>
      <View style={[styles.modalContent, stylesHook.modalContent]}>
        <Text style={[stylesHook.detailsText]}>{loc.lnd.node_alias}</Text>
        <BlueSpacing10 />
        <Text style={[stylesHook.detailsText]}>{channels[selectedChannelIndex]?.remotePubkey}</Text>
        <BlueSpacing20 />
        <LNNodeBar
          disabled={!channels[selectedChannelIndex]?.active}
          canSend={Number(channels[selectedChannelIndex]?.localBalance)}
          canReceive={Number(channels[selectedChannelIndex]?.capacity)}
          itemPriceUnit={wallet.getPreferredBalanceUnit()}
        />
        <BlueSpacing20 />

        <Text style={[stylesHook.detailsText]}>{loc.settings.electrum_status}</Text>
        <BlueSpacing10 />
        <Text style={[stylesHook.detailsText]}> {channels[selectedChannelIndex]?.active ? loc.lnd.active : loc.lnd.inactive}</Text>
        <BlueSpacing20 />

        <Text style={[stylesHook.detailsText]}>{loc.lnd.local_reserve}</Text>
        <BlueSpacing10 />
        <Text style={[stylesHook.detailsText]}>
          {formatBalanceWithoutSuffix(
            channels[selectedChannelIndex]?.localChanReserveSat,
            wallet.getPreferredBalanceUnit(),
            true,
          ).toString()}
        </Text>

        <BlueSpacing40 />
        <Button onPress={() => closeChannel(channels[selectedChannelIndex])} text={loc.lnd.close_channel} buttonStyle={ButtonStyle.destroy} />
      </View>
    </BottomModal>
  );

  const renderItemChannel = channel => {
    console.warn(channel);
    return (
      <TouchableOpacity onPress={() => showModal(channel.index)}>
        <LNNodeBar
          disabled={!channel.item.active}
          canSend={Number(channel.item.localBalance)}
          canReceive={Number(channel.item.capacity)}
          itemPriceUnit={wallet.getPreferredBalanceUnit()}
          nodeAlias={channel.item.remotePubkey}
        />
      </TouchableOpacity>
    );
  };

  const navigateToOpenPublicChannel = () => {
    navigateToOpenChannel({ isPrivateChannel: false });
  };

  const navigateToOpenPrivateChannel = async () => {
    navigateToOpenChannel({ isPrivateChannel: true });
  };

  const renderNewChannelModal = (
    <BottomModal isVisible={isNewChannelModalVisible} onClose={closeModal}>
      <View style={[styles.newChannelModalContent, stylesHook.modalContent]}>
        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.lnd.new_channel}</Text>
        <BlueListItem
          title={loc.lnd.public}
          subtitleNumberOfLines={0}
          subtitle={loc.lnd.public_description}
          onPress={navigateToOpenPublicChannel}
        />
        <BlueListItem
          title={loc.lnd.private}
          subtitleNumberOfLines={0}
          subtitle={loc.lnd.private_description}
          onPress={navigateToOpenPrivateChannel}
          bottomDivider={false}
        />
      </View>
    </BottomModal>
  );

  const navigateToOpenChannel = async ({ isPrivateChannel }) => {
    closeModal();
    const availableWallets = [...wallets.filter(item => item.isSegwit() && item.allowSend())];
    if (availableWallets.length === 0) {
      return alert(loc.lnd.refill_create);
    }

    /** @type {AbstractWallet} */
    const selectedWallet = await selectWallet(navigate, name, false, availableWallets);
    return navigate('LndOpenChannel', {
      fundingWalletID: selectedWallet.getID(),
      lndWalletID: wallet.getID(),
      isPrivateChannel,
    });
  };

  const showNewChannelModal = () => {
    setIsNewChannelModalVisible(true);
  };

  const itemSeparatorComponent = () => {
    return <View style={[styles.separator, stylesHook.separator]} />;
  };

  if (isLoading) {
    return (
      <View style={[styles.root, stylesHook.root]}>
        <BlueLoading />
      </View>
    );
  }

  return (
    <SafeBlueArea styles={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="default" />
      <View style={styles.root}>
        {wBalance && wBalance.confirmedBalance && (
          <BlueButton onPress={claimBalance} title={'Claim balance ' + wBalance.confirmedBalance + ' sat'} />
        )}

        <FlatList
          data={channels}
          renderItem={renderItemChannel}
          keyExtractor={channel => channel.chanId}
          contentContainerStyle={styles.listStyle}
          ItemSeparatorComponent={itemSeparatorComponent}
        />
        <BlueCard>
          <Button text={loc.lnd.new_channel} onPress={showNewChannelModal} />
        </BlueCard>
        {renderModal}
        {renderNewChannelModal}
      </View>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentContainerStyle: {
    flexGrow: 1,
  },
  listStyle: {
    margin: 16,
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
  modalContent: {
    padding: 24,
    minHeight: 418,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  newChannelModalContent: {
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  separator: {
    height: 1,
    marginTop: 16,
  },
  textHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

LndInfo.navigationOptions = navigationStyle(
  {
    title: loc.lnd.channels,
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

export default LndInfo;
