import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Keyboard, TouchableOpacity, SectionList } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeBlueArea, BlueButton, BlueSpacing20, BlueSpacing10, BlueLoading, BlueTextCentered } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { Chain } from '../../models/bitcoinUnits';
import loc, { formatBalance } from '../../loc';
import LNNodeBar from '../../components/LNNodeBar';
import BottomModal from '../../components/BottomModal';
import Button, { ButtonStyle } from '../../components/Button';
import { Psbt } from 'bitcoinjs-lib';
import { AbstractWallet, LightningLdkWallet } from '../../class';
import alert from '../../components/Alert';
import { useTheme } from '../../components/themes';
const selectWallet = require('../../helpers/select-wallet');
const confirm = require('../../helpers/confirm');
const LdkNodeInfoChannelStatus = { ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING: 'PENDING', STATUS: 'status' };

type LdkInfoRouteProps = RouteProp<
  {
    params: {
      walletID: string;
      psbt: Psbt;
    };
  },
  'params'
>;

const LdkInfo = () => {
  const { walletID } = useRoute<LdkInfoRouteProps>().params;
  const { wallets } = useContext(BlueStorageContext);
  const refreshDataInterval = useRef<NodeJS.Timer>();
  const sectionList = useRef<SectionList | null>();
  const wallet: LightningLdkWallet = wallets.find((w: AbstractWallet) => w.getID() === walletID);
  const { colors } = useTheme();
  const { setOptions, navigate } = useNavigation();
  const name = useRoute().name;
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [inactiveChannels, setInactiveChannels] = useState<any[]>([]);
  const [pendingChannels, setPendingChannels] = useState<any[]>([]);
  const [wBalance, setWalletBalance] = useState<{ confirmedBalance?: number }>({});
  const [maturingBalance, setMaturingBalance] = useState(0);
  const [maturingEta, setMaturingEta] = useState('');
  const centerContent = channels.length === 0 && pendingChannels.length === 0 && inactiveChannels.length === 0;
  const allChannelsAmount = useRef(0);
  // Modals
  const [selectedChannelIndex, setSelectedChannelIndex] = useState<any>();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    listHeaderText: {
      color: colors.foregroundColor,
      backgroundColor: colors.background,
    },
    listHeaderBack: {
      backgroundColor: colors.background,
    },
    detailsText: {
      color: colors.alternativeTextColor,
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

    try {
      const listChannels = await wallet.listChannels();
      if (listChannels && Array.isArray(listChannels)) {
        const activeChannels = listChannels.filter(channel => channel.is_usable === true);
        setChannels(activeChannels);
      } else {
        setChannels([]);
      }
      if (listChannels && Array.isArray(listChannels)) {
        const inactive = listChannels.filter(channel => !channel.is_usable && channel.is_funding_locked);
        setInactiveChannels(inactive);
      } else {
        setInactiveChannels([]);
      }

      if (listChannels && Array.isArray(listChannels)) {
        const listPendingChannels = listChannels.filter(channel => !channel.is_funding_locked);
        setPendingChannels(listPendingChannels);
      } else {
        setPendingChannels([]);
      }
      const walletBalance: { confirmedBalance?: number } = await wallet.walletBalance();
      setWalletBalance(walletBalance);

      setMaturingBalance(await wallet.getMaturingBalance());
      const maturingHeight = await wallet.getMaturingHeight();

      if (maturingHeight > 0) {
        const result = await fetch('https://blockstream.info/api/blocks/tip/height');
        const tip = await result.text();
        const hrs = Math.ceil((maturingHeight - +tip) / 6); // convert blocks to hours
        setMaturingEta(`${hrs} hours`);
      } else {
        setMaturingEta('');
      }
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const channelsAvailable = channels.length + pendingChannels.length + inactiveChannels.length;
    if (allChannelsAmount.current === 0 && channelsAvailable >= 1) {
      sectionList?.current?.scrollToLocation({ animated: false, sectionIndex: 0, itemIndex: 0 });
    }
    allChannelsAmount.current = channelsAvailable;
  }, [channels, pendingChannels, inactiveChannels]);

  // do we even need periodic sync when user stares at this screen..?
  useEffect(() => {
    refetchData().then(() => {
      refreshDataInterval.current = setInterval(() => {
        refetchData(false);
        if (wallet.timeToCheckBlockchain()) {
          wallet.checkBlockchain();
          wallet.reconnectPeersWithPendingChannels();
        }
      }, 2000);
    });
    return () => {
      clearInterval(refreshDataInterval?.current as NodeJS.Timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions({
      headerStyle: {
        backgroundColor: colors.customHeader,
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { height: 0, width: 0 },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  const showModal = (index: any) => {
    setSelectedChannelIndex(index);
  };

  const closeChannel = async (channel: any) => {
    if (!(await confirm())) return;
    setSelectedChannelIndex(undefined);

    const wallets2use = wallets.filter((w: AbstractWallet) => w.chain === Chain.ONCHAIN);

    const toWallet: AbstractWallet = await selectWallet(
      navigate,
      name,
      null,
      wallets2use,
      'Onchain wallet is required to withdraw funds to',
    );
    // using wallets2use instead of simple Chain.ONCHAIN argument because by default this argument only selects wallets
    // that can send, which is not possible if user wants to withdraw to watch-only wallet
    if (!toWallet) return;

    console.warn('want to close to wallet ', toWallet.getLabel());
    const address = await toWallet.getAddressAsync();
    if (!address) return alert('Error: could not get address for channel withdrawal');
    await wallet.setRefundAddress(address);

    let forceClose = false;
    if (!channel.is_usable) {
      if (!(await confirm(loc.lnd.force_close_channel))) return;
      forceClose = true;
    }
    const rez = await wallet.closeChannel(channel.channel_id, forceClose);
    if (rez) {
      alert(loc._.success);
      return refetchData();
    }
  };

  const claimBalance = async () => {
    const wallets2use = wallets.filter((w: AbstractWallet) => w.chain === Chain.ONCHAIN);
    const selectedWallet: AbstractWallet = await selectWallet(
      navigate,
      name,
      null,
      wallets2use,
      'Onchain wallet is required to withdraw funds to',
    );
    // using wallets2use instead of simple Chain.ONCHAIN argument because by default this argument only selects wallets
    // that can send, which is not possible if user wants to withdraw to watch-only wallet
    if (!selectedWallet) return;
    const address = await selectedWallet.getAddressAsync();
    if (address && (await confirm())) {
      console.warn('selected ', selectedWallet.getLabel(), address);
      setIsLoading(true);
      try {
        const rez = await wallet.claimCoins(address);
        if (rez) {
          alert(loc._.success);
          await refetchData();
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setSelectedChannelIndex(undefined);
  };

  const handleOnConnectPeerTapped = async (channelData: any) => {
    closeModal();
    const { pubkey, host, port } = await wallet.lookupNodeConnectionDetailsByPubkey(channelData.remote_node_id);
    return wallet.connectPeer(pubkey, host, port);
  };

  const renderModal = () => {
    const status = selectedChannelIndex?.status;
    const channelData = selectedChannelIndex?.channel.item;
    return (
      <BottomModal isVisible={selectedChannelIndex !== undefined} onClose={closeModal} avoidKeyboard>
        <View style={[styles.modalContent, stylesHook.modalContent]}>
          <Text style={stylesHook.detailsText}>{loc.lnd.node_alias}</Text>
          <BlueSpacing10 />
          {channelData && (
            <Text style={stylesHook.detailsText}>
              {LightningLdkWallet.pubkeyToAlias(channelData.remote_node_id) +
                ' (' +
                channelData.remote_node_id.substr(0, 10) +
                '...' +
                channelData.remote_node_id.substr(-6) +
                ')'}
            </Text>
          )}
          <BlueSpacing20 />
          <LNNodeBar
            disabled={
              status === LdkNodeInfoChannelStatus.ACTIVE || status === LdkNodeInfoChannelStatus.INACTIVE ? !channelData?.is_usable : true
            }
            canSend={Number(channelData?.outbound_capacity_msat / 1000)}
            canReceive={Number(channelData?.inbound_capacity_msat / 1000)}
            itemPriceUnit={wallet.getPreferredBalanceUnit()}
          />

          <Text style={stylesHook.detailsText}>
            {status === LdkNodeInfoChannelStatus.PENDING
              ? loc.transactions.pending
              : channelData?.is_usable
              ? loc.lnd.active
              : loc.lnd.inactive}
          </Text>

          {status === LdkNodeInfoChannelStatus.INACTIVE && (
            <>
              <Button onPress={() => handleOnConnectPeerTapped(channelData)} text={loc.lnd.reconnect_peer} buttonStyle={ButtonStyle.grey} />
              <BlueSpacing20 />
            </>
          )}

          <Button onPress={() => closeChannel(channelData)} text={loc.lnd.close_channel} buttonStyle={ButtonStyle.destroy} />
          <BlueSpacing20 />
        </View>
      </BottomModal>
    );
  };

  const renderSectionItem = (item: any) => {
    switch (item.section.key) {
      case LdkNodeInfoChannelStatus.ACTIVE:
        return renderItemChannel({ status: LdkNodeInfoChannelStatus.ACTIVE, channel: item });
      case LdkNodeInfoChannelStatus.PENDING:
        return renderItemChannel({ status: LdkNodeInfoChannelStatus.PENDING, channel: item });
      case LdkNodeInfoChannelStatus.INACTIVE:
        return renderItemChannel({ status: LdkNodeInfoChannelStatus.INACTIVE, channel: item });
      default:
        return null;
    }
  };

  const renderItemChannel = (channel: any) => {
    const channelData = channel.channel.item;

    return (
      <TouchableOpacity accessibilityRole="button" onPress={() => showModal(channel)}>
        <LNNodeBar
          disabled={!channelData.is_usable}
          canSend={Number(channelData.outbound_capacity_msat / 1000)}
          canReceive={Number(channelData.inbound_capacity_msat / 1000)}
          itemPriceUnit={wallet.getPreferredBalanceUnit()}
          nodeAlias={LightningLdkWallet.pubkeyToAlias(channelData.remote_node_id)}
        />
      </TouchableOpacity>
    );
  };

  const navigateToOpenPrivateChannel = async () => {
    navigateToOpenChannel({ isPrivateChannel: true });
  };

  const navigateToOpenChannel = async ({ isPrivateChannel }: { isPrivateChannel: boolean }) => {
    const availableWallets = [...wallets.filter((item: AbstractWallet) => item.isSegwit() && item.allowSend())];
    if (availableWallets.length === 0) {
      return alert(loc.lnd.refill_create);
    }
    // @ts-ignore: Address types later
    navigate('LDKOpenChannelRoot', {
      screen: 'SelectWallet',
      params: {
        availableWallets,
        chainType: Chain.ONCHAIN,
        onWalletSelect: (selectedWallet: AbstractWallet) => {
          const selectedWalletID = selectedWallet.getID();
          selectedWallet.getAddressAsync().then(selectWallet.setRefundAddress);
          // @ts-ignore: Address types later
          navigate('LDKOpenChannelRoot', {
            screen: 'LDKOpenChannelSetAmount',
            params: {
              isPrivateChannel,
              fundingWalletID: selectedWalletID,
              ldkWalletID: walletID,
            },
          });
        },
      },
    });
  };

  const itemSeparatorComponent = () => {
    return <View style={[styles.separator, stylesHook.separator]} />;
  };

  const renderSectionHeader = (section: any) => {
    switch (section.section.key) {
      case LdkNodeInfoChannelStatus.PENDING:
        return <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.pending}</Text>;
      case LdkNodeInfoChannelStatus.ACTIVE:
        return <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.lnd.active}</Text>;
      case LdkNodeInfoChannelStatus.INACTIVE:
        return <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.lnd.inactive}</Text>;

      default:
        return null;
    }
  };

  const sections = () => {
    const sectionForList = [];
    if (channels.length > 0) {
      sectionForList.push({ key: LdkNodeInfoChannelStatus.ACTIVE, data: channels });
    }
    if (inactiveChannels.length > 0) {
      sectionForList.push({ key: LdkNodeInfoChannelStatus.INACTIVE, data: inactiveChannels });
    }
    if (pendingChannels.length > 0) {
      sectionForList.push({ key: LdkNodeInfoChannelStatus.PENDING, data: pendingChannels });
    }
    return sectionForList;
  };

  // @ts-ignore This kind of magic is not allowed in typescript, we should try and be more specific
  return (
    <SafeBlueArea styles={[styles.root, stylesHook.root]}>
      <SectionList
        ref={(ref: SectionList) => {
          sectionList.current = ref;
        }}
        renderItem={renderSectionItem}
        keyExtractor={channel => channel.channel_id}
        initialNumToRender={7}
        ItemSeparatorComponent={itemSeparatorComponent}
        renderSectionHeader={section => (
          <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>{renderSectionHeader(section)}</View>
        )}
        contentContainerStyle={[centerContent ? {} : styles.contentContainerStyle, stylesHook.root]}
        contentInset={{ top: 0, left: 0, bottom: 8, right: 0 }}
        centerContent={centerContent}
        sections={sections()}
        ListEmptyComponent={isLoading ? <BlueLoading /> : <BlueTextCentered>{loc.lnd.no_channels}</BlueTextCentered>}
      />
      {renderModal()}

      <View style={styles.marginHorizontal16}>
        {wBalance && wBalance.confirmedBalance ? (
          <>
            <BlueButton
              onPress={claimBalance}
              title={loc.formatString(loc.lnd.claim_balance, {
                balance: formatBalance(wBalance.confirmedBalance, wallet.getPreferredBalanceUnit()),
              })}
            />
            <BlueSpacing20 />
          </>
        ) : null}
        {maturingBalance ? (
          <Text style={stylesHook.detailsText}>
            Balance awaiting confirmations: {formatBalance(Number(maturingBalance), wallet.getPreferredBalanceUnit(), true)}
          </Text>
        ) : null}
        {maturingEta ? <Text style={stylesHook.detailsText}>ETA: {maturingEta}</Text> : null}
        <Button text={loc.lnd.new_channel} onPress={navigateToOpenPrivateChannel} disabled={isLoading} />
        <BlueSpacing20 />
      </View>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  marginHorizontal16: {
    marginHorizontal: 16,
  },
  contentContainerStyle: {
    marginHorizontal: 16,
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
  modalContent: {
    minHeight: 418,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 24,
  },
  separator: {
    height: 1,
    marginTop: 16,
  },
});

LdkInfo.navigationOptions = navigationStyle(
  {
    title: loc.lnd.channels,
  },
  (options, { theme, navigation, route }) => {
    return {
      ...options,
      statusBarStyle: 'auto',
    };
  },
);

export default LdkInfo;
