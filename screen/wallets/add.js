/* global alert */
import React, { useState, useEffect, useContext } from 'react';
import {
  Text,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  StatusBar,
  TextInput,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {
  BlueText,
  BlueListItem,
  LightningButton,
  BitcoinButton,
  VaultButton,
  BlueFormLabel,
  BlueButton,
  BlueNavigationStyle,
  BlueButtonLink,
  BlueSpacing20,
} from '../../BlueComponents';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, HDSegwitP2SHWallet, LightningCustodianWallet, AppStorage } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Chain } from '../../models/bitcoinUnits';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const A = require('../../blue_modules/analytics');

const ButtonSelected = Object.freeze({
  ONCHAIN: Chain.ONCHAIN,
  OFFCHAIN: Chain.OFFCHAIN,
  VAULT: 'VAULT',
});

const WalletsAdd = () => {
  const { colors } = useTheme();
  const { addWallet, saveToDisk, setNewWalletAdded, isAdancedModeEnabled } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBaseURI, setWalletBaseURI] = useState();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [label, setLabel] = useState('');
  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState(false);
  const { navigate, goBack } = useNavigation();
  const [entropy, setEntropy] = useState();
  const [entropyButtonText, setEntropyButtonText] = useState(loc.wallets.add_entropy_provide);
  const stylesHook = {
    advancedText: {
      color: colors.feeText,
    },
    label: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    noPadding: {
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    lndUri: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  };

  useEffect(() => {
    AsyncStorage.getItem(AppStorage.LNDHUB)
      .then(setWalletBaseURI)
      .catch(() => setWalletBaseURI(''));
    isAdancedModeEnabled()
      .then(setIsAdvancedOptionsEnabled)
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedOptionsEnabled]);

  const entropyGenerated = newEntropy => {
    let entropyTitle;
    if (!newEntropy) {
      entropyTitle = loc.wallets.add_entropy_provide;
    } else if (newEntropy.length < 32) {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_remain, {
        gen: newEntropy.length,
        rem: 32 - newEntropy.length,
      });
    } else {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_generated, {
        gen: newEntropy.length,
      });
    }
    setEntropy(newEntropy);
    setEntropyButtonText(entropyTitle);
  };

  const createWallet = async () => {
    setIsLoading(true);

    let w;

    if (selectedWalletType === ButtonSelected.OFFCHAIN) {
      createLightningWallet(w);
    } else if (selectedWalletType === ButtonSelected.ONCHAIN) {
      if (selectedIndex === 2) {
        // zero index radio - HD segwit
        w = new HDSegwitP2SHWallet();
        w.setLabel(label || loc.wallets.details_title);
      } else if (selectedIndex === 1) {
        // btc was selected
        // index 1 radio - segwit single address
        w = new SegwitP2SHWallet();
        w.setLabel(label || loc.wallets.details_title);
      } else {
        // btc was selected
        // index 2 radio - hd bip84
        w = new HDSegwitBech32Wallet();
        w.setLabel(label || loc.wallets.details_title);
      }
      if (selectedWalletType === ButtonSelected.ONCHAIN) {
        if (entropy) {
          try {
            await w.generateFromEntropy(entropy);
          } catch (e) {
            console.log(e.toString());
            alert(e.toString());
            goBack();
            return;
          }
        } else {
          await w.generate();
        }
        addWallet(w);
        await saveToDisk();
        setNewWalletAdded(true);
        A(A.ENUM.CREATED_WALLET);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
        if (w.type === HDSegwitP2SHWallet.type || w.type === HDSegwitBech32Wallet.type) {
          navigate('PleaseBackup', {
            walletID: w.getID(),
          });
        } else {
          goBack();
        }
      }
    } else if (selectedWalletType === ButtonSelected.VAULT) {
      setIsLoading(false);
      navigate('WalletsAddMultisig');
    }
  };

  const createLightningWallet = async wallet => {
    wallet = new LightningCustodianWallet();
    wallet.setLabel(label || loc.wallets.details_title);

    try {
      const lndhub = walletBaseURI && walletBaseURI.trim().length > 0 ? walletBaseURI : LightningCustodianWallet.defaultBaseUri;
      if (lndhub) {
        const isValidNodeAddress = await LightningCustodianWallet.isValidNodeAddress(lndhub);
        if (isValidNodeAddress) {
          wallet.setBaseURI(lndhub);
          wallet.init();
        } else {
          throw new Error('The provided node address is not valid LNDHub node.');
        }
      }
      await wallet.createAccount();
      await wallet.authorize();
    } catch (Err) {
      setIsLoading(false);
      console.warn('lnd create failure', Err);
      return alert(Err);
      // giving app, not adding anything
    }
    A(A.ENUM.CREATED_LIGHTNING_WALLET);
    await wallet.generate();
    addWallet(wallet);
    await saveToDisk();

    setNewWalletAdded(true);
    A(A.ENUM.CREATED_WALLET);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    navigate('PleaseBackupLNDHub', {
      walletID: wallet.getID(),
    });
  };

  const navigateToEntropy = () => {
    navigate('ProvideEntropy', { onGenerated: entropyGenerated });
  };

  const navigateToImportWallet = () => {
    navigate('ImportWallet');
  };

  const handleOnVaultButtonPressed = () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.VAULT);
  };

  const handleOnBitcoinButtonPressed = () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.ONCHAIN);
  };

  const handleOnLightningButtonPressed = () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.OFFCHAIN);
  };

  return (
    <ScrollView style={stylesHook.root}>
      <StatusBar barStyle="light-content" />
      <BlueSpacing20 />
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
        <BlueFormLabel>{loc.wallets.add_wallet_name}</BlueFormLabel>
        <View style={[styles.label, stylesHook.label]}>
          <TextInput
            testID="WalletNameInput"
            value={label}
            placeholderTextColor="#81868e"
            placeholder="my first wallet"
            onChangeText={setLabel}
            style={styles.textInputCommon}
            editable={!isLoading}
            underlineColorAndroid="transparent"
          />
        </View>
        <BlueFormLabel>{loc.wallets.add_wallet_type}</BlueFormLabel>
        <View style={styles.buttons}>
          <BitcoinButton
            testID="ActivateBitcoinButton"
            active={selectedWalletType === ButtonSelected.ONCHAIN}
            onPress={handleOnBitcoinButtonPressed}
            style={styles.button}
          />
          <LightningButton
            active={selectedWalletType === ButtonSelected.OFFCHAIN}
            onPress={handleOnLightningButtonPressed}
            style={styles.button}
          />
          <VaultButton active={selectedWalletType === ButtonSelected.VAULT} onPress={handleOnVaultButtonPressed} style={styles.button} />
        </View>

        <View style={styles.advanced}>
          {(() => {
            if (selectedWalletType === ButtonSelected.ONCHAIN && isAdvancedOptionsEnabled) {
              return (
                <View>
                  <BlueSpacing20 />
                  <Text style={[styles.advancedText, stylesHook.advancedText]}>{loc.settings.advanced_options}</Text>
                  <BlueListItem
                    containerStyle={[styles.noPadding, stylesHook.noPadding]}
                    bottomDivider={false}
                    onPress={() => setSelectedIndex(0)}
                    title={HDSegwitBech32Wallet.typeReadable}
                    checkmark={selectedIndex === 0}
                  />
                  <BlueListItem
                    containerStyle={[styles.noPadding, stylesHook.noPadding]}
                    bottomDivider={false}
                    onPress={() => setSelectedIndex(1)}
                    title={SegwitP2SHWallet.typeReadable}
                    checkmark={selectedIndex === 1}
                  />
                  <BlueListItem
                    containerStyle={[styles.noPadding, stylesHook.noPadding]}
                    bottomDivider={false}
                    onPress={() => setSelectedIndex(2)}
                    title={HDSegwitP2SHWallet.typeReadable}
                    checkmark={selectedIndex === 2}
                  />
                </View>
              );
            } else if (selectedWalletType === ButtonSelected.OFFCHAIN && isAdvancedOptionsEnabled) {
              return (
                <>
                  <BlueSpacing20 />
                  <Text style={[styles.advancedText, stylesHook.advancedText]}>{loc.settings.advanced_options}</Text>
                  <BlueSpacing20 />
                  <BlueText>Connect to your LNDHub</BlueText>
                  <View style={[styles.lndUri, stylesHook.lndUri]}>
                    <TextInput
                      value={walletBaseURI}
                      onChangeText={setWalletBaseURI}
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder="your node address"
                      clearButtonMode="while-editing"
                      autoCapitalize="none"
                      textContentType="URL"
                      autoCorrect={false}
                      placeholderTextColor="#81868e"
                      style={styles.textInputCommon}
                      editable={!isLoading}
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </>
              );
            }
          })()}
          {isAdvancedOptionsEnabled && selectedWalletType === ButtonSelected.ONCHAIN && !isLoading && (
            <BlueButtonLink style={styles.import} title={entropyButtonText} onPress={navigateToEntropy} />
          )}
          <BlueSpacing20 />
          <View style={styles.createButton}>
            {!isLoading ? (
              <BlueButton testID="Create" title={loc.wallets.add_create} disabled={!selectedWalletType} onPress={createWallet} />
            ) : (
              <ActivityIndicator />
            )}
          </View>
          {!isLoading && (
            <BlueButtonLink
              testID="ImportWallet"
              style={styles.import}
              title={loc.wallets.add_import_wallet}
              onPress={navigateToImportWallet}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

WalletsAdd.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  headerTitle: loc.wallets.add_title,
  headerLeft: null,
});

const styles = StyleSheet.create({
  createButton: {
    flex: 1,
  },
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  label: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  textInputCommon: {
    flex: 1,
    marginHorizontal: 8,
    color: '#81868e',
  },
  buttons: {
    flexDirection: 'column',
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 0,
    minHeight: 100,
  },
  button: {
    width: '100%',
    height: 'auto',
  },
  advanced: {
    marginHorizontal: 20,
  },
  advancedText: {
    fontWeight: '500',
  },
  lndUri: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  import: {
    marginBottom: 0,
    marginTop: 24,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
  typeMargin: {
    marginTop: 8,
  },
});

export default WalletsAdd;
