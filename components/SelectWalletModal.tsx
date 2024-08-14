import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { ActivityIndicator, StyleSheet, View, FlatList } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueSpacing20, BlueText } from '../BlueComponents';
import SafeArea from '../components/SafeArea';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { useStorage } from '../hooks/context/useStorage';
import WalletsCarousel from '../components/WalletsCarousel';
import BottomModal, { BottomModalHandle } from '../components/BottomModal';
import { TWallet } from '../class/wallets/types';

interface SelectWalletModalProps {
  chainType: Chain;
  onWalletSelect: (wallet: TWallet, navigation: any) => void;
  availableWallets?: TWallet[];
  noWalletExplanationText?: string;
  onChainRequireSend?: boolean;
  onClose?: () => void;
}

export interface SelectWalletModalHandle extends BottomModalHandle {}

const SelectWalletModal: React.ForwardRefRenderFunction<SelectWalletModalHandle, SelectWalletModalProps> = (
  {
    chainType,
    onWalletSelect,
    availableWallets,
    noWalletExplanationText,
    onChainRequireSend = false,
    onClose,
  },
  ref
) => {
  const [isLoading, setIsLoading] = useState(true);
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const walletsCarousel = useRef<FlatList>(null);
  const bottomModalRef = useRef<BottomModalHandle>(null);

  useImperativeHandle(ref, () => ({
    present: async () => {
      bottomModalRef.current?.present();
    },
    dismiss: async () => {
      bottomModalRef.current?.dismiss();
    },
  }));

  let data = !onChainRequireSend
    ? wallets.filter(item => item.chain === Chain.ONCHAIN)
    : chainType
    ? wallets.filter(item => item.chain === chainType && item.allowSend())
    : wallets.filter(item => item.allowSend());

  if (availableWallets && availableWallets.length > 0) {
    data = availableWallets;
  }

  const stylesHook = StyleSheet.create({
    loading: {
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const onPress = (item: TWallet) => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    onWalletSelect?.(item, { dismiss: onClose });
  };

  return (
    <BottomModal scrollRef={walletsCarousel} ref={bottomModalRef} onClose={onClose}>
      {isLoading ? (
        <View style={[styles.loading, stylesHook.loading]}>
          <ActivityIndicator />
        </View>
      ) : data.length <= 0 ? (
        <SafeArea>
          <View style={styles.noWallets}>
            <BlueText style={styles.center}>{loc.wallets.select_no_bitcoin}</BlueText>
            <BlueSpacing20 />
            <BlueText style={styles.center}>{noWalletExplanationText || loc.wallets.select_no_bitcoin_exp}</BlueText>
          </View>
        </SafeArea>
      ) : (
        <WalletsCarousel data={data} onPress={onPress} ref={walletsCarousel} testID="WalletsList" horizontal={false} />
      )}
    </BottomModal>
  );
};

export default forwardRef(SelectWalletModal);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    paddingTop: 20,
  },
  noWallets: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  center: {
    textAlign: 'center',
  },
});