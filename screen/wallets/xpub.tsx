import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, LayoutChangeEvent } from 'react-native';
import Share from 'react-native-share';
import BlueText from '../../components/BlueText';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCode from '../../components/QRCode';
import SafeArea from '../../components/SafeArea';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import { styles, useDynamicStyles } from './xpub.styles';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';
import { WalletDescriptor } from '../../class/wallet-descriptor.ts';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

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
  const lastWalletIdRef = useRef<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      // Skip execution if walletID hasn't changed
      if (lastWalletIdRef.current === walletID) {
        return;
      }
      let cancelled = false;
      (async () => {
        if (wallet) {
          const walletXpub = wallet.getXpub();
          if (!cancelled && xpub !== walletXpub) {
            navigation.setParams({ xpub: walletXpub || undefined });
          }
          if (!cancelled) setIsLoading(false);
        } else if (xpub && !cancelled) {
          setIsLoading(false);
        }
      })();
      lastWalletIdRef.current = walletID;
      return () => {
        disableScreenProtect();
        cancelled = true;
      };
    }, [isPrivacyBlurEnabled, walletID, wallet, xpub, navigation, enableScreenProtect, disableScreenProtect]),
  );

  useEffect(() => {
    (async () => {
      if (wallet && wallet?.type === HDTaprootWallet.type && wallet.getDerivationPath) {
        await new Promise(resolve => setTimeout(resolve, 100)); // sleep to propagate ui
        // need to convert xpub to a wallet descriptor
        const fp = wallet.getMasterFingerprintHex();
        const path = wallet.getDerivationPath() ?? '';
        const xpub2 = WalletDescriptor.getDescriptor(fp, path, wallet.getXpub());
        setXPubText(xpub2);
      } else {
        setXPubText(xpub);
      }
    })();
  }, [wallet, xpub]);

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
    <SafeArea style={[styles.root, stylesHook.root]} onLayout={onLayout}>
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
          <View style={styles.share}>
            <Button onPress={handleShareButtonPressed} title={loc.receive.details_share} />
          </View>
        </>
      )}
    </SafeArea>
  );
};

export default WalletXpub;
