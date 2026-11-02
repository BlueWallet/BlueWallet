import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, View } from 'react-native';
import Share from 'react-native-share';
import BlueText from '../../components/BlueText';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCode from '../../components/QRCode';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import { styles, useDynamicStyles } from './xpub.styles';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { WalletDescriptor } from '../../class/wallet-descriptor.ts';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { isIOS26OrHigher } from '../../blue_modules/environment';

type WalletXpubRouteProp = RouteProp<DetailViewStackParamList, 'WalletXpub'>;

const WalletXpub: React.FC = () => {
  const { wallets } = useStorage();
  const route = useRoute<WalletXpubRouteProp>();
  const { walletID, xpub } = route.params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const { isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [xPubText, setXPubText] = useState<string | undefined>(undefined);
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'WalletXpub'>>();
  const stylesHook = useDynamicStyles(); // This now includes the theme implicitly
  const [qrCodeSize, setQRCodeSize] = useState<number>(90);

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [isPrivacyBlurEnabled, enableScreenProtect, disableScreenProtect]),
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const idleCallback = requestIdleCallback(
      () => {
        let descriptor: string | undefined;
        try {
          if (wallet) {
            const walletXpub = wallet.getXpub();
            if (walletXpub && xpub !== walletXpub) {
              navigation.setParams({ xpub: walletXpub });
            }
            descriptor = WalletDescriptor.fromWallet(wallet);
          }
        } catch (_) {}

        if (!cancelled) {
          setXPubText(descriptor ?? xpub);
          setIsLoading(false);
        }
      },
      { timeout: 500 },
    );

    return () => {
      cancelled = true;
      cancelIdleCallback(idleCallback);
    };
  }, [navigation, wallet, xpub]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;

    const isPortrait = height > width;
    const maxQRSize = 450;

    if (isPortrait) {
      const heightBasedSize = Math.min(height * 0.6, maxQRSize);
      const widthBasedSize = width * 0.8;
      setQRCodeSize(Math.min(heightBasedSize, widthBasedSize));
    } else {
      const heightBasedSize = Math.min(height * 0.55, maxQRSize);
      const widthBasedSize = width * 0.38;
      setQRCodeSize(Math.min(heightBasedSize, widthBasedSize));
    }
  };

  const handleShareButtonPressed = useCallback(() => {
    Share.open({ message: xPubText || xpub }).catch(console.log);
  }, [xPubText, xpub]);

  return (
    <SafeAreaScrollView
      style={[styles.root, stylesHook.root]}
      contentContainerStyle={[styles.scrollContent, isLoading && styles.loadingContent]}
      showsVerticalScrollIndicator={false}
      onLayout={onLayout}
    >
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <View style={styles.container}>
            {wallet && (
              <>
                <View>
                  <BlueText>{wallet.typeReadable}</BlueText>
                </View>
                <BlueSpacing20 />
              </>
            )}
            <QRCode value={xPubText || xpub} size={qrCodeSize} />

            {xPubText && (
              <View style={styles.copyText}>
                <CopyTextToClipboard text={xPubText} />
              </View>
            )}
          </View>
          <HandOffComponent title={loc.wallets.xpub_title} type={HandOffActivityType.Xpub} userInfo={{ xpub: xPubText }} />
          {!isIOS26OrHigher && (
            <View style={styles.share}>
              <Button onPress={handleShareButtonPressed} title={loc.receive.details_share} />
            </View>
          )}
        </>
      )}
    </SafeAreaScrollView>
  );
};

export default WalletXpub;
