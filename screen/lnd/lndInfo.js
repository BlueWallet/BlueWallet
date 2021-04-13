/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import { View, StatusBar, BackHandler, StyleSheet, Text, Keyboard, TouchableOpacity, SectionList } from 'react-native';
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
const LNDNodeInfoChannelStatus = { ACTIVE: 'Active', PENDING: 'PENDING', STATUS: 'status' };

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
  const [channels, setChannels] = useState([]);
  const [pendingChannels, setPendingChannels] = useState([]);
  const [wBalance, setWalletBalance] = useState({});
  const [selectedChannelIndex, setSelectedChannelIndex] = useState();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    valueText: {
      color: colors.alternativeTextColor2,
    },
    listHeaderText: {
      color: colors.foregroundColor,
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
    setIsLoading(true);

    const listChannels = await wallet.listChannels();
    if (listChannels && listChannels.channels) setChannels(listChannels.channels);
    const listPendingChannels = await wallet.pendingChannels();
    if (listPendingChannels && listPendingChannels.pendingOpenChannels && listPendingChannels.pendingOpenChannels.length > 0)
      setPendingChannels(listPendingChannels.pendingOpenChannels);
    const walletBalance = await wallet.walletBalance();
    setWalletBalance(walletBalance);

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

  const renderModal = () => {
    if (selectedChannelIndex === undefined) return null;
    const status = selectedChannelIndex.status;
    const channelData =
      status === LNDNodeInfoChannelStatus.ACTIVE ? selectedChannelIndex.channel.item : selectedChannelIndex.channel.item.channel;
    return (
      <BottomModal isVisible={selectedChannelIndex !== undefined} onClose={closeModal}>
        <View style={[styles.modalContent, stylesHook.modalContent]}>
          <Text style={[stylesHook.detailsText]}>{loc.lnd.node_alias}</Text>
          <BlueSpacing10 />
          {channelData && (
            <Text style={[stylesHook.detailsText]}>
              {status === LNDNodeInfoChannelStatus.ACTIVE ? channelData.remotePubkey : channelData.remoteNodePub}
            </Text>
          )}
          <BlueSpacing20 />
          <LNNodeBar
            disabled={status === LNDNodeInfoChannelStatus.ACTIVE ? channelData.active : true}
            canSend={channelData && Number(channelData.localBalance)}
            canReceive={channelData && Number(channelData.capacity)}
            itemPriceUnit={wallet.getPreferredBalanceUnit()}
          />
          <Text style={[stylesHook.detailsText]}>{loc.settings.electrum_status}</Text>
          <BlueSpacing10 />
          <Text style={[stylesHook.detailsText]}>
            {status === LNDNodeInfoChannelStatus.PENDING
              ? loc.transactions.pending
              : channelData.active
              ? loc.lnd.active
              : loc.lnd.inactive}
          </Text>
          <BlueSpacing20 />
          {channelData && status === LNDNodeInfoChannelStatus.ACTIVE && (
            <>
              <Text style={[stylesHook.detailsText]}>{loc.lnd.local_reserve}</Text>
              <BlueSpacing10 />
              <Text style={[stylesHook.detailsText]}>
                {formatBalanceWithoutSuffix(channels.localChanReserveSat, wallet.getPreferredBalanceUnit(), true).toString()}
              </Text>
              <BlueSpacing40 />
            </>
          )}
          <Button onPress={() => closeChannel(channelData)} text={loc.lnd.close_channel} buttonStyle={ButtonStyle.destroy} />
        </View>
      </BottomModal>
    );
  };

  const renderSectionItem = item => {
    switch (item.section.key) {
      case LNDNodeInfoChannelStatus.ACTIVE:
        return renderItemChannel({ status: LNDNodeInfoChannelStatus.ACTIVE, channel: item });
      case LNDNodeInfoChannelStatus.PENDING:
        return renderItemChannel({ status: LNDNodeInfoChannelStatus.PENDING, channel: item });
      default:
        return null;
    }
  };

  const renderItemChannel = channel => {
    const channelData = channel.status === LNDNodeInfoChannelStatus.ACTIVE ? channel.channel.item : channel.channel.item.channel;
    return (
      <TouchableOpacity onPress={() => showModal(channel)}>
        <LNNodeBar
          disabled={!channelData.active}
          canSend={Number(channelData.localBalance)}
          canReceive={Number(channelData.capacity)}
          itemPriceUnit={wallet.getPreferredBalanceUnit()}
          nodeAlias={channel.status === LNDNodeInfoChannelStatus.ACTIVE ? channelData.remotePubkey : channelData.remoteNodePub}
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

  const renderSectionHeader = section => {
    switch (section.section.key) {
      case LNDNodeInfoChannelStatus.PENDING:
        return <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.pending}</Text>;
      case LNDNodeInfoChannelStatus.ACTIVE:
        return <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.lnd.active}</Text>;

      default:
        return null;
    }
  };

  const sections = () => {
    const sectionForList = [];
    if (channels.length > 0) {
      sectionForList.push({ key: LNDNodeInfoChannelStatus.ACTIVE, data: channels });
    }
    if (pendingChannels.length > 0) {
      sectionForList.push({ key: LNDNodeInfoChannelStatus.PENDING, data: pendingChannels });
    }
    return sectionForList;
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

        <SectionList
          renderItem={renderSectionItem}
          keyExtractor={channel => channel.channelPoint}
          initialNumToRender={7}
          ItemSeparatorComponent={itemSeparatorComponent}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listStyle}
          contentInset={{ top: 0, left: 0, bottom: 8, right: 0 }}
          sections={sections()}
        />
        <BlueCard>
          <Button text={loc.lnd.new_channel} onPress={showNewChannelModal} />
        </BlueCard>
        {renderModal()}
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
    marginVertical: 8,
    marginHorizontal: 16,
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
  listHeaderText: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 24,
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
