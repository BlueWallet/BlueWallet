import React, { useRef, useState, useEffect } from 'react';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Keyboard, StyleSheet, TextInput, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { BlueButtonLink, BlueCard, BlueSpacing10, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { TWallet } from '../../class/wallets/types';
import { WalletCarouselItem } from '../../components/WalletsCarousel';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Divider } from '@rneui/themed';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import presentAlert from '../../components/Alert';
import { navigate } from '../../NavigationService';

type RouteProps = RouteProp<DetailViewStackParamList, 'IsItMyAddress'>;
type NavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'IsItMyAddress'>;

const IsItMyAddress: React.FC = () => {
  const { wallets } = useStorage();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const scanButtonRef = useRef<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const firstWalletRef = useRef<View>(null);

  const [address, setAddress] = useState<string>('');
  const [matchingWallets, setMatchingWallets] = useState<TWallet[] | undefined>();
  const [resultCleanAddress, setResultCleanAddress] = useState<string | undefined>();

  const stylesHooks = StyleSheet.create({
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  useEffect(() => {
    if (route.params?.address && route.params.address !== address) {
      setAddress(route.params.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.address]);

  useEffect(() => {
    const currentAddress = route.params?.address;
    if (currentAddress !== address) {
      navigation.setParams({ address });
    }
  }, [address, navigation, route.params?.address]);

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

  const onBarScanned = (value: string) => {
    const cleanAddress = value.replace(/^bitcoin(:|=)/i, '').split('?')[0];
    setAddress(value);
    setResultCleanAddress(cleanAddress);
  };

  const importScan = async () => {
    navigate('ScanQRCode');
  };

  useEffect(() => {
    const data = route.params?.onBarScanned;
    if (data) {
      onBarScanned(data);
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [navigation, route.name, route.params?.onBarScanned]);

  const viewQRCode = () => {
    if (!resultCleanAddress) return;
    navigation.navigate('ReceiveDetailsRoot', {
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
          <Text key={`bold-${index++}`} style={styles.boldText} selectable>
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
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.wrapper}
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <BlueCard style={styles.mainCard}>
        <View style={[styles.input, stylesHooks.input]}>
          <TextInput
            style={styles.textInput}
            multiline
            editable
            placeholder={loc.is_it_my_address.enter_address}
            placeholderTextColor={colors.placeholderTextColor}
            value={address}
            onChangeText={handleUpdateAddress}
            testID="AddressInput"
          />
          {address.length > 0 && (
            <TouchableOpacity onPress={clearAddressInput} style={styles.clearButton}>
              <Icon name="close" size={20} color="#81868e" />
            </TouchableOpacity>
          )}
        </View>

        <BlueSpacing10 />
        <BlueButtonLink ref={scanButtonRef} title={loc.wallets.import_scan_qr} onPress={importScan} />
        <BlueSpacing20 />
        {resultCleanAddress && (
          <>
            <Button title={loc.is_it_my_address.view_qrcode} onPress={viewQRCode} />
            <BlueSpacing20 />
          </>
        )}
        <Button disabled={isCheckAddressDisabled} title={loc.is_it_my_address.check_address} onPress={checkAddress} testID="CheckAddress" />
        <BlueSpacing40 />

        {matchingWallets !== undefined && matchingWallets.length > 0 && (
          <>
            <Divider />
            <BlueSpacing40 />
          </>
        )}
        {matchingWallets !== undefined &&
          matchingWallets.length > 0 &&
          matchingWallets.map((wallet, index) => (
            <View key={wallet.getID()} ref={index === 0 ? firstWalletRef : undefined} style={styles.walletContainer}>
              <BlueText selectable style={styles.resultText}>
                {resultCleanAddress &&
                  renderFormattedText(loc.is_it_my_address.owns, {
                    label: wallet.getLabel(),
                    address: resultCleanAddress,
                  })}
              </BlueText>
              <BlueSpacing10 />
              <WalletCarouselItem
                item={wallet}
                onPress={item => {
                  navigation.navigate('WalletTransactions', {
                    walletID: item.getID(),
                    walletType: item.type,
                  });
                }}
              />
              <BlueSpacing20 />
            </View>
          ))}
      </BlueCard>
    </ScrollView>
  );
};

export default IsItMyAddress;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  mainCard: {
    padding: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    alignItems: 'center',
    borderRadius: 4,
    width: '100%',
  },
  textInput: {
    flex: 1,
    padding: 8,
    minHeight: 100,
    color: '#81868e',
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boldText: {
    fontWeight: 'bold',
  },
  resultText: {
    marginVertical: 10,
    textAlign: 'center',
  },
  walletContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
