import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, View, Platform } from 'react-native';
import ListItem from '../../components/ListItem';
import { useStorage } from '../../hooks/context/useStorage';
import DeviceInfo from 'react-native-device-info';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import presentAlert from '../../components/Alert';
import selectWallet from '../../helpers/select-wallet';
import { Chain } from '../../models/bitcoinUnits';
import { useSettings } from '../../hooks/context/useSettings';

const ShortcutSettings: React.FC<{ navigate: (screen: string) => void }> = ({ navigate }) => {
  const [isSupportedEnvironment, setIsSupportedEnvironment] = useState(false);
  const { wallets } = useStorage();
  const { setSelectedDefaultWallet, getSelectedDefaultWallet } = useOnAppLaunch();
  const { receiveBitcoinIntent, setReceiveBitcoinIntent } = useSettings();

  useEffect(() => {
    const checkEnvironment = async () => {
      const systemVersion = await DeviceInfo.getSystemVersion();
      const majorVersion = parseInt(systemVersion.split('.')[0], 10);

      if ((Platform.OS === 'ios' && majorVersion >= 16) || Platform.OS === 'macos') {
        setIsSupportedEnvironment(true);
      }
    };

    checkEnvironment();
  }, []);

  useEffect(() => {
    const initializeDefaultWallet = async () => {
      const walletID = await getSelectedDefaultWallet();
      if (!walletID) {
        return;
      }
      const selectedWallet = wallets.find(wallet => wallet.getID() === walletID);
      if (selectedWallet) {
        await setReceiveBitcoinIntent(selectedWallet);
      }
    };

    initializeDefaultWallet();
  }, [wallets, getSelectedDefaultWallet, setReceiveBitcoinIntent]);

  const selectWalletForReceiveBitcoinIntent = async () => {
    if (wallets.length === 0) {
      presentAlert({ message: loc.settings.no_wallet_available });
    } else {
      const wallet = await selectWallet(navigate, 'SelectWallet', Chain.ONCHAIN);
      if (wallet) {
        await setReceiveBitcoinIntent(wallet);
      }
    }
  };

  const onReceiveBitcoinIntentSwitchValueChanged = async (value: boolean) => {
    if (value) {
      const firstWallet = wallets[0];
      if (firstWallet) {
        await setReceiveBitcoinIntent(firstWallet);
      }
    } else {
      await setReceiveBitcoinIntent(undefined);
    }
  };

  const onViewAllWalletsSwitchValueChanged = async (value: boolean) => {
    if (value) {
      const firstWallet = wallets[0];
      if (firstWallet) {
        await setSelectedDefaultWallet(firstWallet.getID());
      }
    } else {
      await setSelectedDefaultWallet(undefined);
    }
  };

  return (
    <ScrollView automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="automatic">
      <View>
        {isSupportedEnvironment && (
          <View>
            <ListItem
              title={loc.settings.view_wallet_transactions}
              Component={TouchableWithoutFeedback}
              switch={{
                onValueChange: onViewAllWalletsSwitchValueChanged,
                value: wallets.length > 0,
                disabled: wallets.length <= 0,
              }}
              subtitle={loc.settings.summary_transactions}
            />

            <ListItem
              title={loc.wallets.select_wallet}
              rightTitle={wallets[0]?.getLabel() || loc.settings.no_wallet_selected}
              onPress={selectWalletForReceiveBitcoinIntent}
              chevron
              disabled={wallets.length <= 0}
            />

            <ListItem
              title={loc.settings.receive_bitcoin_intent}
              Component={TouchableWithoutFeedback}
              switch={{
                onValueChange: onReceiveBitcoinIntentSwitchValueChanged,
                value: receiveBitcoinIntent !== undefined,
              }}
              subtitle={loc.settings.enable_receive_bitcoin_intent_desc}
            />

            {receiveBitcoinIntent && (
              <ListItem
                title={loc.wallets.select_wallet}
                rightTitle={receiveBitcoinIntent?.label}
                onPress={selectWalletForReceiveBitcoinIntent}
                chevron
                disabled={true}
              />
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ShortcutSettings;