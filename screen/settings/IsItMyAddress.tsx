import React, { useRef, useState, useEffect } from 'react';
import { Keyboard, TextInput, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Button from '../../components/Button';
import { BlueButtonLink, BlueSpacing10, BlueSpacing20 } from '../../BlueComponents';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { TWallet } from '../../class/wallets/types';
import { WalletCarouselItem } from '../../components/WalletsCarousel';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Divider } from '@rneui/themed';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import presentAlert from '../../components/Alert';
import { scanQrHelper } from '../../helpers/scan-qr.ts';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation.ts';
import SafeAreaScrollView from '../../components/SafeAreaScrollView.tsx';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import { usePlatformTheme } from '../../components/platformThemes';
import { useTheme } from '../../components/themes.ts';

const IsItMyAddress: React.FC = () => {
  const { navigate } = useExtendedNavigation();
  const { wallets } = useStorage();
  const { styles } = useSettingsStyles();
  const { colors } = usePlatformTheme();
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const firstWalletRef = useRef<View>(null);

  const [address, setAddress] = useState<string>('');
  const [matchingWallets, setMatchingWallets] = useState<TWallet[] | undefined>();
  const [resultCleanAddress, setResultCleanAddress] = useState<string | undefined>();

  const handleUpdateAddress = (nextValue: string) => setAddress(nextValue);

  const clearAddressInput = () => {
    setAddress('');
    setResultCleanAddress(undefined);
    setMatchingWallets(undefined);
  };

  const checkAddress = () => {
    Keyboard.dismiss();
    const cleanAddress = address.replace('bitcoin:', '').replace('BITCOIN:', '').replace('bitcoin=', '').split('?')[0];
    const matching: TWallet[] = [];

    for (const w of wallets) {
      if (w.weOwnAddress(cleanAddress)) {
        matching.push(w);
      }
    }

    if (matching.length > 0) {
      setMatchingWallets(matching);
      setResultCleanAddress(cleanAddress);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    } else {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({
        message: loc.is_it_my_address.no_wallet_owns_address,
        buttons: [
          {
            text: loc.receive.reset,
            onPress: () => {
              clearAddressInput();
            },
            style: 'destructive',
          },
          {
            text: loc._.ok,
            onPress: () => {},
            style: 'cancel',
          },
        ],
        options: { cancelable: true },
      });
      setMatchingWallets([]);
      setResultCleanAddress(undefined);
    }
  };

  const importScan = async () => {
    const value = await scanQrHelper();
    const cleanAddress = value.replace(/^bitcoin(:|=)/i, '').split('?')[0];
    setAddress(value);
    setResultCleanAddress(cleanAddress);
  };

  const viewQRCode = () => {
    if (!resultCleanAddress) return;
    navigate('ReceiveDetailsRoot', {
      screen: 'ReceiveDetails',
      params: {
        address: resultCleanAddress,
      },
    });
  };

  const isCheckAddressDisabled = address.trim().length === 0;

  useEffect(() => {
    if (matchingWallets && matchingWallets.length > 0 && scrollViewRef.current && firstWalletRef.current) {
      firstWalletRef.current.measureLayout(scrollViewRef.current.getInnerViewNode(), (x, y) => {
        scrollViewRef.current?.scrollTo({ x: 0, y: y - 20, animated: true });
      });
    }
  }, [matchingWallets]);

  const renderFormattedText = (text: string, values: { [key: string]: string }) => {
    const regex = /\{(\w+)\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let index = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<Text key={`text-${index++}`}>{text.substring(lastIndex, match.index)}</Text>);
      }
      const value = values[match[1]];
      if (value) {
        parts.push(
          <Text key={`bold-${index++}`} selectable>
            {value}
          </Text>,
        );
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(<Text key={`text-${index++}`}>{text.substring(lastIndex)}</Text>);
    }
    return parts;
  };

  return (
    <SafeAreaScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.card}>
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            multiline
            editable
            placeholder={loc.is_it_my_address.enter_address}
            placeholderTextColor={theme.colors.placeholderTextColor}
            value={address}
            onChangeText={handleUpdateAddress}
            testID="AddressInput"
          />
          {address.length > 0 && (
            <TouchableOpacity onPress={clearAddressInput} style={styles.clearButton}>
              <Icon name="close" size={20} color={colors.subtitleColor} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.spacingSmall} />
        <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} />
        <View style={styles.spacingMedium} />
        {resultCleanAddress && (
          <>
            <Button title={loc.is_it_my_address.view_qrcode} onPress={viewQRCode} />
            <View style={styles.spacingMedium} />
          </>
        )}
        <Button disabled={isCheckAddressDisabled} title={loc.is_it_my_address.check_address} onPress={checkAddress} testID="CheckAddress" />
        <View style={styles.spacingLarge} />

        {matchingWallets !== undefined && matchingWallets.length > 0 && (
          <>
            <Divider />
            <View style={styles.spacingLarge} />
          </>
        )}
        {matchingWallets !== undefined &&
          matchingWallets.length > 0 &&
          matchingWallets.map((wallet, index) => (
            <View key={wallet.getID()} ref={index === 0 ? firstWalletRef : undefined} style={styles.addressCheckContainer}>
              <Text selectable style={styles.addressOwnershipText}>
                {resultCleanAddress &&
                  renderFormattedText(loc.is_it_my_address.owns, {
                    label: wallet.getLabel(),
                    address: resultCleanAddress,
                  })}
              </Text>
              <BlueSpacing10 />
              <WalletCarouselItem
                item={wallet}
                onPress={item => {
                  navigate('WalletTransactions', {
                    walletID: item.getID(),
                    walletType: item.type,
                  });
                }}
              />
              <BlueSpacing20 />
            </View>
          ))}
      </View>
    </SafeAreaScrollView>
  );
};

export default IsItMyAddress;
