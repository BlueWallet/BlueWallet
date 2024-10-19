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
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useRoute } from '@react-navigation/native';
import { TWallet } from '../../class/wallets/types';

const ShortcutSettings: React.FC = () => {
  const { wallets } = useStorage();
  const { navigate } = useExtendedNavigation();
  const { name } = useRoute();
  const { setSelectedDefaultWallet, getSelectedDefaultWallet } = useOnAppLaunch();
  const { receiveBitcoinIntent, setReceiveBitcoinIntent } = useSettings();
  const [isSupportedEnvironment, setIsSupportedEnvironment] = useState(false);
  const [defaultWallet, setDefaultWallet] = useState<TWallet | null>(null);

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
      const selectedWalletID = await getSelectedDefaultWallet();
      if (selectedWalletID) {
        const selectedWallet = wallets.find(wallet => wallet.getID() === selectedWalletID);
        if (selectedWallet) {
          setDefaultWallet(selectedWallet);
        }
      }
    };
    initializeDefaultWallet();
  }, [wallets, getSelectedDefaultWallet]);

  const selectWalletForReceiveBitcoinIntent = async () => {
    if (wallets.length === 0) {
      presentAlert({ message: loc.settings.no_wallet_available });
    } else {
      const wallet = await selectWallet(navigate, name, Chain.ONCHAIN);
      if (wallet) {
        await setReceiveBitcoinIntent(wallet);
      }
    }
  };

  const selectWalletForDefault = async () => {
    if (wallets.length === 0) {
      presentAlert({ message: loc.settings.no_wallet_available });
    } else {
      const wallet = await selectWallet(navigate, name, Chain.ONCHAIN);
      if (wallet) {
        await setSelectedDefaultWallet(wallet.getID());
        setDefaultWallet(wallet);
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
    if (!value) {
      const firstWallet = wallets[0];
      if (firstWallet) {
        await setSelectedDefaultWallet(firstWallet.getID());
        setDefaultWallet(firstWallet);
      }
    } else {
      await setSelectedDefaultWallet(undefined);
      setDefaultWallet(null);
    }
  };

  return (
    <ScrollView automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="automatic">
      <View>
        {isSupportedEnvironment && (
          <View>
            {/* Section: View All Wallets */}
            <ListItem
              title={loc.settings.view_wallet_transactions}
              Component={TouchableWithoutFeedback}
              switch={{
                onValueChange: onViewAllWalletsSwitchValueChanged,
                value: defaultWallet === null,
                disabled: wallets.length <= 0,
              }}
              subtitle={loc.settings.summary_transactions}
            />

            {/* Only show the wallet selection for default wallet */}
            {defaultWallet !== null && (
              <ListItem
                title={loc.wallets.select_wallet}
                rightTitle={defaultWallet ? (defaultWallet as TWallet).getLabel() : loc.settings.no_wallet_selected}
                onPress={selectWalletForDefault}
                chevron
                disabled={wallets.length <= 0}
              />
            )}

            {/* Section: Receive Bitcoin Intent */}
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
                disabled={wallets.length <= 0}
              />
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ShortcutSettings;
