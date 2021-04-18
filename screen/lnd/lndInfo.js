/* global alert */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, StatusBar, StyleSheet, Text, Keyboard, TouchableOpacity, SectionList, Linking } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import {
  SafeBlueArea,
  BlueButton,
  BlueSpacing20,
  BlueSpacing40,
  BlueSpacing10,
  BlueListItem,
  BlueLoading,
  BlueTextCentered,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { Chain } from '../../models/bitcoinUnits';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import LNNodeBar from '../../components/LNNodeBar';
import BottomModal from '../../components/BottomModal';
import Button, { ButtonStyle } from '../../components/Button';
import LndOpenChannel from './lndOpenChannel';

const selectWallet = require('../../helpers/select-wallet');
const confirm = require('../../helpers/confirm');
const LNDNodeInfoChannelStatus = { ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING: 'PENDING', STATUS: 'status' };

const LndInfo = () => {
  const { walletID, isModal, psbt } = useRoute().params;
  const { wallets } = useContext(BlueStorageContext);
  const refreshDataInterval = useRef();
  const sectionList = useRef();
  /** @type {LightningLndWallet} */
  const wallet = wallets.find(w => w.getID() === walletID);
  const { colors } = useTheme();
  const { setOptions, setParams, navigate } = useNavigation();
  const name = useRoute().name;
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [inactiveChannels, setInactiveChannels] = useState([]);
  const [pendingChannels, setPendingChannels] = useState([]);
  const [wBalance, setWalletBalance] = useState({});
  const [centerContent, setCenterContent] = useState(true);

  // Modals
  const [selectedChannelIndex, setSelectedChannelIndex] = useState();
  const [isNewChannelModalVisible, setIsNewChannelModalVisible] = useState(false);
  const [newOpenChannelModalProps, setNewOpenChannelModalProps] = useState();
  const [newOpenChannelModalVisible, setNewOpenChannelModalVisible] = useState(false);

  //
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    valueText: {
      color: colors.alternativeTextColor2,
    },
    listHeaderText: {
      color: colors.foregroundColor,
      backgroundColor: colors.background,
    },
    listHeaderBack: {
      backgroundColor: colors.background,
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

  const refetchData = async (withLoadingIndicator = true) => {
    setIsLoading(withLoadingIndicator);

    let hasChannels = false;
    let hasPendingChannels = false;
    const listChannels = await wallet.listChannels();
    if (listChannels && listChannels.channels) {
      setChannels(listChannels.channels.filter(channel => channel.active === true));
      hasChannels = true;
    }
    if (listChannels && listChannels.channels) {
      setInactiveChannels(listChannels.channels.filter(channel => !channel.active));
      hasChannels = true;
    }
    const listPendingChannels = await wallet.pendingChannels();
    if (listPendingChannels && listPendingChannels.pendingOpenChannels && listPendingChannels.pendingOpenChannels.length > 0) {
      setPendingChannels(listPendingChannels.pendingOpenChannels);
      hasPendingChannels = true;
    }
    const walletBalance = await wallet.walletBalance();
    setWalletBalance(walletBalance);
    if (centerContent) {
      setCenterContent(!(hasChannels || hasPendingChannels));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!centerContent) {
      sectionList.current.scrollToLocation({ animated: false, sectionIndex: 0, itemIndex: 0 });
    }
  }, [centerContent]);

  useEffect(() => {
    refetchData().then(() => {
      refreshDataInterval.current = setInterval(() => {
        refetchData(false);
      }, 5000);
    });
    return () => {
      clearInterval(refreshDataInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (psbt) {
      setNewOpenChannelModalVisible(true);
    }
  }, [psbt]);

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

  const handleOnOpenTransactionOnBlockExporerTapped = channelData => {
    const txid = channelData.channelPoint.split(':')[0];
    const url = `https://mempool.space/tx/${txid}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

  const renderModal = () => {
    const status = selectedChannelIndex?.status;
    const channelData =
      status === LNDNodeInfoChannelStatus.ACTIVE || status === LNDNodeInfoChannelStatus.INACTIVE
        ? selectedChannelIndex?.channel.item
        : selectedChannelIndex?.channel.item.channel;
    return (
      <BottomModal isVisible={selectedChannelIndex !== undefined} onClose={closeModal} avoidKeyboard>
        <View style={[styles.modalContent, stylesHook.modalContent]}>
          <Text style={[stylesHook.detailsText]}>{loc.lnd.node_alias}</Text>
          <BlueSpacing10 />
          {channelData && (
            <Text style={[stylesHook.detailsText]}>
              {status === LNDNodeInfoChannelStatus.ACTIVE || status === LNDNodeInfoChannelStatus.INACTIVE
                ? channelData.remotePubkey
                : channelData.remoteNodePub}
            </Text>
          )}
          <BlueSpacing20 />
          <LNNodeBar
            disabled={
              status === LNDNodeInfoChannelStatus.ACTIVE || status === LNDNodeInfoChannelStatus.INACTIVE ? channelData?.active : true
            }
            canSend={Number(channelData?.localBalance)}
            canReceive={Number(channelData?.capacity)}
            itemPriceUnit={wallet.getPreferredBalanceUnit()}
          />
          <Text style={[stylesHook.detailsText]}>{loc.settings.electrum_status}</Text>
          <BlueSpacing10 />
          <Text style={[stylesHook.detailsText]}>
            {status === LNDNodeInfoChannelStatus.PENDING
              ? loc.transactions.pending
              : channelData?.active
              ? loc.lnd.active
              : loc.lnd.inactive}
          </Text>
          <BlueSpacing20 />
          {status === LNDNodeInfoChannelStatus.ACTIVE ||
            (status === LNDNodeInfoChannelStatus.INACTIVE && (
              <>
                <Text style={[stylesHook.detailsText]}>{loc.lnd.local_reserve}</Text>
                <BlueSpacing10 />
                <Text style={[stylesHook.detailsText]}>
                  {formatBalanceWithoutSuffix(channels?.localChanReserveSat, wallet?.getPreferredBalanceUnit(), true).toString()}
                </Text>
                <BlueSpacing40 />
              </>
            ))}
          {status === LNDNodeInfoChannelStatus.PENDING && (
            <>
              <Button
                onPress={() => handleOnOpenTransactionOnBlockExporerTapped(channelData)}
                text={loc.transactions.details_show_in_block_explorer}
                buttonStyle={ButtonStyle.grey}
              />
              <BlueSpacing20 />
            </>
          )}

          <Button onPress={() => closeChannel(channelData)} text={loc.lnd.close_channel} buttonStyle={ButtonStyle.destroy} />
          <BlueSpacing20 />
          <BlueButton onPress={onNewOpenChannelModalBackdropPress} title={loc.send.input_done} />
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
      case LNDNodeInfoChannelStatus.INACTIVE:
        return renderItemChannel({ status: LNDNodeInfoChannelStatus.INACTIVE, channel: item });
      default:
        return null;
    }
  };

  const renderItemChannel = channel => {
    const channelData =
      channel.status === LNDNodeInfoChannelStatus.ACTIVE || channel.status === LNDNodeInfoChannelStatus.INACTIVE
        ? channel.channel.item
        : channel.channel.item.channel;

    return (
      <TouchableOpacity onPress={() => showModal(channel)}>
        <LNNodeBar
          disabled={!channelData.active}
          canSend={Number(channelData.localBalance)}
          canReceive={Number(channelData.capacity)}
          itemPriceUnit={wallet.getPreferredBalanceUnit()}
          nodeAlias={
            channel.status === LNDNodeInfoChannelStatus.ACTIVE || channel.status === LNDNodeInfoChannelStatus.INACTIVE
              ? channelData.remotePubkey
              : channelData.remoteNodePub
          }
        />
      </TouchableOpacity>
    );
  };

  const onNewOpenChannelModalBackdropPress = () => {
    closeModal();
    setNewOpenChannelModalVisible(false);
    setTimeout(() => {
      setNewOpenChannelModalProps(undefined);
      setParams({ psbt: undefined });
      refetchData(false);
    }, 500);
  };

  const navigateToOpenPublicChannel = () => {
    navigateToOpenChannel({ isPrivateChannel: false });
  };

  const navigateToOpenPrivateChannel = async () => {
    navigateToOpenChannel({ isPrivateChannel: true });
  };

  const renderNewChannelModal = (
    <BottomModal isVisible={isNewChannelModalVisible} onClose={closeModal} avoidKeyboard>
      <View style={[styles.newChannelModalContent, stylesHook.modalContent]}>
        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.lnd.new_channel}</Text>
        <BlueSpacing20 />
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
        <BlueSpacing20 />

        <BlueButton onPress={onNewOpenChannelModalBackdropPress} title={loc._.cancel} />
      </View>
    </BottomModal>
  );

  const navigateToOpenChannel = async ({ isPrivateChannel }) => {
    closeModal();
    setNewOpenChannelModalVisible(false);
    const availableWallets = [...wallets.filter(item => item.isSegwit() && item.allowSend())];
    if (availableWallets.length === 0) {
      return alert(loc.lnd.refill_create);
    }

    /** @type {AbstractWallet} */
    const selectedWallet = await selectWallet(navigate, name, false, availableWallets);
    setNewOpenChannelModalProps({ fundingWalletID: selectedWallet.getID(), isPrivateChannel });
    setNewOpenChannelModalVisible(true);
  };
  const closeNewOpenChannelModalPropsModal = () => {
    setNewOpenChannelModalVisible(false);
  };

  const onBackdropPress = async () => {
    if (await confirm('Are you sure you exit without opening a channel?')) {
      onNewOpenChannelModalBackdropPress();
    }
  };

  const renderOpenChannelAmountAndNoteModal = () => {
    return (
      <BottomModal
        isVisible={newOpenChannelModalVisible}
        onClose={closeNewOpenChannelModalPropsModal}
        onBackdropPress={onBackdropPress}
        avoidKeyboard
      >
        <View style={[styles.fundingNewChannelModalContent, stylesHook.modalContent]}>
          <LndOpenChannel
            psbt={psbt}
            pendingChanId={newOpenChannelModalProps?.pendingChanIdTemp}
            lndWalletID={walletID}
            fundingWalletID={newOpenChannelModalProps?.fundingWalletID}
            isPrivateChannel={newOpenChannelModalProps?.isPrivateChannel}
            closeContainerModal={closeNewOpenChannelModalPropsModal}
            psbtOpenChannelStartedTs={newOpenChannelModalProps?.psbtOpenChannelStartedTs}
            onPsbtOpenChannelStartedTsChange={psbtOpenChannelStartedTs =>
              setNewOpenChannelModalProps(prevState => {
                return { ...prevState, psbtOpenChannelStartedTs };
              })
            }
            onPendingChanIdTempChange={pendingChanIdTemp =>
              setNewOpenChannelModalProps(prevState => {
                return { ...prevState, pendingChanIdTemp };
              })
            }
            onOpenChannelSuccess={onNewOpenChannelModalBackdropPress}
            unit={newOpenChannelModalProps?.unit ?? wallet.getPreferredBalanceUnit()}
            onUnitChange={unit =>
              setNewOpenChannelModalProps(prevState => {
                return { ...prevState, unit };
              })
            }
            fundingAmount={newOpenChannelModalProps?.fundingAmount}
            onFundingAmountChange={fundingAmount =>
              setNewOpenChannelModalProps(prevState => {
                return { ...prevState, fundingAmount };
              })
            }
            remoteHostWithPubkey={newOpenChannelModalProps?.remoteHostWithPubkey}
            onRemoteHostWithPubkeyChange={pubkey => {
              setNewOpenChannelModalProps(prevState => {
                return { ...prevState, remoteHostWithPubkey: pubkey };
              });
              setNewOpenChannelModalVisible(true);
            }}
          />
        </View>
      </BottomModal>
    );
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
      case LNDNodeInfoChannelStatus.INACTIVE:
        return <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.lnd.inactive}</Text>;

      default:
        return null;
    }
  };

  const sections = () => {
    const sectionForList = [];
    if (channels.length > 0) {
      sectionForList.push({ key: LNDNodeInfoChannelStatus.ACTIVE, data: channels });
    }
    if (inactiveChannels.length > 0) {
      sectionForList.push({ key: LNDNodeInfoChannelStatus.INACTIVE, data: inactiveChannels });
    }
    if (pendingChannels.length > 0) {
      sectionForList.push({ key: LNDNodeInfoChannelStatus.PENDING, data: pendingChannels });
    }
    return sectionForList;
  };

  return (
    <SafeBlueArea styles={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="default" />
      <SectionList
        ref={sectionList}
        renderItem={renderSectionItem}
        keyExtractor={channel => channel.channelPoint}
        initialNumToRender={7}
        ItemSeparatorComponent={itemSeparatorComponent}
        renderSectionHeader={section => (
          <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>{renderSectionHeader(section)}</View>
        )}
        contentContainerStyle={[centerContent ? {} : styles.contentContainerStyle, stylesHook.root]}
        contentInset={{ top: 0, left: 0, bottom: 8, right: 0 }}
        centerContent={centerContent}
        sections={sections()}
        ListEmptyComponent={isLoading ? <BlueLoading /> : <BlueTextCentered>No channels</BlueTextCentered>}
      />
      {renderModal()}
      {renderNewChannelModal}
      {renderOpenChannelAmountAndNoteModal()}

      <View style={styles.marginHorizontal16}>
        {wBalance && wBalance.confirmedBalance && (
          <>
            <BlueButton onPress={claimBalance} title={'Claim balance ' + wBalance.confirmedBalance + ' sat'} />
            <BlueSpacing20 />
          </>
        )}
        <Button text={loc.lnd.new_channel} onPress={showNewChannelModal} disabled={isLoading} />
      </View>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  height100: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marginHorizontal16: {
    marginHorizontal: 16,
  },
  contentContainerStyle: {
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
  listHeaderBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    minHeight: 418,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 24,
  },
  newChannelModalContent: {
    padding: 24,
    minHeight: 350,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  fundingNewChannelModalContent: {
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    height: 340,
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
