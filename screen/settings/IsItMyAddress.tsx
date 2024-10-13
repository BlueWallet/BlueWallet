import React, { useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { Keyboard, StyleSheet, TextInput, View, ScrollView, TouchableOpacity } from 'react-native';
import { BlueButtonLink, BlueCard, BlueSpacing10, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { scanQrHelper } from '../../helpers/scan-qr';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { TWallet } from '../../class/wallets/types';
import { WalletCarouselItem } from '../../components/WalletsCarousel';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Divider } from '@rneui/themed';

type NavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'IsItMyAddress'>;

const IsItMyAddress: React.FC = () => {
  const { wallets } = useStorage();
  const { navigate } = useExtendedNavigation<NavigationProp>();
  const { name } = useRoute();
  const { colors } = useTheme();
  const scanButtonRef = useRef<any>();

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
    } else {
      setMatchingWallets([]);
      setResultCleanAddress(undefined);
    }
  };

  const onBarScanned = (value: string) => {
    setAddress(value);
    setResultCleanAddress(value);
  };

  const importScan = async () => {
    const data = await scanQrHelper(name, true);
    if (data) {
      onBarScanned(data);
    }
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

  const isCheckAddressDisabled = address.trim().length === 0 || (matchingWallets !== undefined && address.trim() === resultCleanAddress);

  return (
    <ScrollView
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
            placeholderTextColor="#81868e"
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

        {matchingWallets !== undefined && matchingWallets.length > 0 && <Divider />}
        <BlueSpacing40 />
        {matchingWallets !== undefined &&
          (matchingWallets.length > 0 ? (
            matchingWallets.map(wallet => (
              <View key={wallet.getID()}>
                <BlueText>
                  {resultCleanAddress &&
                    loc.formatString(loc.is_it_my_address.owns, {
                      label: wallet.getLabel(),
                      address: resultCleanAddress,
                    })}
                </BlueText>
                <WalletCarouselItem
                  item={wallet}
                  onPress={item => {
                    navigate('WalletTransactions', { walletID: item.getID(), walletType: item.type });
                  }}
                />
                <BlueSpacing20 />
              </View>
            ))
          ) : (
            <BlueText>{loc.is_it_my_address.no_wallet_owns_address}</BlueText>
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
});
