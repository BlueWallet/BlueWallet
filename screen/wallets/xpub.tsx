import { NavigationProp, RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, View } from 'react-native';
import Share from 'react-native-share';
import { BlueSpacing20, BlueText } from '../../BlueComponents';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeArea from '../../components/SafeArea';
import { disallowScreenshot } from 'react-native-screen-capture';
import loc from '../../loc';
import { styles, useDynamicStyles } from './xpub.styles';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';

type WalletXpubRouteProp = RouteProp<{ params: { walletID: string; xpub: string } }, 'params'>;
export type RootStackParamList = {
  WalletXpub: {
    walletID: string;
    xpub: string;
  };
};

const WalletXpub: React.FC = () => {
  const { wallets } = useStorage();
  const route = useRoute<WalletXpubRouteProp>();
  const { walletID, xpub } = route.params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const { isPrivacyBlurEnabled } = useSettings();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [xPubText, setXPubText] = useState<string | undefined>(undefined);
  const navigation = useNavigation<NavigationProp<RootStackParamList, 'WalletXpub'>>();
  const stylesHook = useDynamicStyles(); // This now includes the theme implicitly
  const [qrCodeSize, setQRCodeSize] = useState<number>(90);
  const lastWalletIdRef = useRef<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      if (!isDesktop) disallowScreenshot(isPrivacyBlurEnabled);
      // Skip execution if walletID hasn't changed
      if (lastWalletIdRef.current === walletID) {
        return;
      }
      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          const walletXpub = wallet.getXpub();
          if (xpub !== walletXpub) {
            navigation.setParams({ xpub: walletXpub || undefined });
          }

          setIsLoading(false);
        } else if (xpub) {
          setIsLoading(false);
        }
      });
      lastWalletIdRef.current = walletID;
      return () => {
        if (!isDesktop) disallowScreenshot(false);
        task.cancel();
      };
    }, [isPrivacyBlurEnabled, walletID, wallet, xpub, navigation]),
  );

  useEffect(() => {
    setXPubText(xpub);
  }, [xpub]);

  const onLayout = (e: { nativeEvent: { layout: { width: any; height?: any } } }) => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.8);
  };

  const handleShareButtonPressed = useCallback(() => {
    Share.open({ message: xpub }).catch(console.log);
  }, [xpub]);

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
            <QRCodeComponent value={xpub} size={qrCodeSize} />

            <BlueSpacing20 />
            {xPubText && <CopyTextToClipboard text={xPubText} />}
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
