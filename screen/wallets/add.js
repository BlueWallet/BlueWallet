import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View
} from 'react-native';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Dialog from 'react-native-dialog';
import {
  BlueButton,
  BlueButtonLink, BlueFormLabel, BlueListItem, BlueSpacing20, BlueText, LightningButton
} from '../../BlueComponents';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import {
  AppStorage, HDSegwitBech32Wallet, HDSegwitP2SHWallet,
  LightningCustodianWallet, LightningLdkWallet, SegwitP2SHWallet
} from '../../class';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import alert from '../../components/Alert';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';

const A = require('../../blue_modules/analytics');
const scanqrHelper = require('../../helpers/scan-qr');

const ButtonSelected = Object.freeze({
  ONCHAIN: Chain.ONCHAIN,
  OFFCHAIN: Chain.OFFCHAIN,
  VAULT: 'VAULT',
  LDK: 'LDK',
});

const WalletsAdd = () => {
  const routeName = useRoute().name;
  const { colors } = useTheme();
  const { addWallet, saveToDisk, isAdvancedModeEnabled, wallets } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBaseURI, setWalletBaseURI] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [label, setLabel] = useState('');
  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState(ButtonSelected.OFFCHAIN);
  const [backdoorPressed, setBackdoorPressed] = useState(1);
  const { navigate, goBack } = useNavigation();
  const [entropy, setEntropy] = useState();
  const [entropyButtonText, setEntropyButtonText] = useState(loc.wallets.add_entropy_provide);
  const [invalidNode, setInvalidNode] = useState(false);

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
      .then(url => setWalletBaseURI(url))
      .catch(() => setWalletBaseURI(''));
    isAdvancedModeEnabled()
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
      navigate('WalletsAddMultisig', { walletLabel: label.trim().length > 0 ? label : loc.multisig.default_label });
    } else if (selectedWalletType === ButtonSelected.LDK) {
      setIsLoading(false);
      createLightningLdkWallet(w);
    }
  };

  const createLightningLdkWallet = async wallet => {
    const foundLdk = wallets.find(w => w.type === LightningLdkWallet.type);
    if (foundLdk) {
      return alert('LDK wallet already exists');
    }
    setIsLoading(true);
    wallet = new LightningLdkWallet();
    wallet.setLabel(label || loc.wallets.details_title);

    await wallet.generate();
    await wallet.init();
    setIsLoading(false);
    addWallet(wallet);
    await saveToDisk();

    A(A.ENUM.CREATED_WALLET);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    navigate('PleaseBackupLdk', {
      walletID: wallet.getID(),
    });
  };

  const createLightningWallet = async wallet => {
    wallet = new LightningCustodianWallet();
    wallet.setLabel(label || loc.wallets.details_title);

    try {
      const lndhub = walletBaseURI?.trim();
      if (lndhub) {
        const isValidNodeAddress = await LightningCustodianWallet.isValidNodeAddress(lndhub);
        if (isValidNodeAddress) {
          wallet.setBaseURI(lndhub);
          await wallet.init();
        } else {
          setInvalidNode(true);
          return;
          // throw new Error('The provided node address is not valid Bolt card Hub node.');
        }
      }
      await wallet.createAccount();
      await wallet.authorize();
    } catch (Err) {
      setIsLoading(false);
      console.warn('lnd create failure', Err);
      if (Err.message) {
        return alert(Err.message);
      } else {
        return alert(loc.wallets.add_lndhub_error);
      }
      // giving app, not adding anything
    }
    A(A.ENUM.CREATED_LIGHTNING_WALLET);
    await wallet.generate();
    addWallet(wallet);
    await saveToDisk();

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
    setBackdoorPressed(prevState => {
      return prevState + 1;
    });
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.OFFCHAIN);
  };

  const handleOnLdkButtonPressed = async () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.LDK);
  };

  const onBarScanned = value => {
    if (!value) return;
    let url = DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(value);
    console.log('onBarScanned', url);
    setWalletBaseURI(url);
  };

  const clearInvalidNodeError = () => {
    setInvalidNode(false);
    setIsLoading(false);
  }

  return (
    <ScrollView style={stylesHook.root}>
      <StatusBar
        barStyle={Platform.select({ ios: 'light-content', default: useColorScheme() === 'dark' ? 'light-content' : 'dark-content' })}
      />
      <Dialog.Container visible={invalidNode}>
          <Text style={{fontSize:20, textAlign: 'center', borderColor:'black'}}>
            This is not a valid <Text style={{color: '#fb8e33', fontSize:20}} onPress={() => Linking.openURL('https://github.com/boltcard/boltcard-lndhub')}>bolt card hub</Text>
          </Text>
          <Dialog.Button label="Close"
          onPress={() => {
              clearInvalidNodeError();
          }} />
      </Dialog.Container>
      <BlueSpacing20 />
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
        <BlueFormLabel>{loc.wallets.add_wallet_name}</BlueFormLabel>
        <View style={[styles.label, stylesHook.label]}>
          <TextInput
            testID="WalletNameInput"
            value={label}
            placeholderTextColor="#81868e"
            placeholder={loc.wallets.add_placeholder}
            onChangeText={setLabel}
            style={styles.textInputCommon}
            editable={!isLoading}
            underlineColorAndroid="transparent"
          />
        </View>
        <BlueFormLabel>{loc.wallets.add_wallet_type}</BlueFormLabel>
        <View style={styles.buttons}>
          {/* <BitcoinButton
            testID="ActivateBitcoinButton"
            active={selectedWalletType === ButtonSelected.ONCHAIN}
            onPress={handleOnBitcoinButtonPressed}
            style={styles.button}
          /> */}
          <LightningButton
            active={selectedWalletType === ButtonSelected.OFFCHAIN}
            onPress={handleOnLightningButtonPressed}
            style={styles.button}
          />
          {/* {backdoorPressed > 10 ? (
            <LdkButton
              active={selectedWalletType === ButtonSelected.LDK}
              onPress={handleOnLdkButtonPressed}
              style={styles.button}
              subtext={LightningLdkWallet.getPackageVersion()}
              text="LDK"
            />
          ) : null}
          <VaultButton active={selectedWalletType === ButtonSelected.VAULT} onPress={handleOnVaultButtonPressed} style={styles.button} /> */}
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
            } else if (selectedWalletType === ButtonSelected.OFFCHAIN) {
              return (
                <>
                  <BlueSpacing20 />
                  <BlueText>{loc.wallets.add_lndhub}</BlueText>
                  <View style={[styles.lndUri, stylesHook.lndUri]}>
                    <TextInput
                      value={walletBaseURI}
                      onChangeText={setWalletBaseURI}
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder={loc.wallets.add_lndhub_placeholder}
                      clearButtonMode="while-editing"
                      autoCapitalize="none"
                      textContentType="URL"
                      autoCorrect={false}
                      placeholderTextColor="#81868e"
                      style={styles.textInputCommon}
                      editable={!isLoading}
                      underlineColorAndroid="transparent"
                    />
                  <TouchableOpacity
                    onPress={()=>{scanqrHelper(navigate, routeName, false).then(onBarScanned)}}
                  >
                    <Icon name='qrcode' size={18} type="font-awesome" color="#9aa0aa" />
                  </TouchableOpacity>
                  </View>
                  <BlueText>{loc.wallets.add_lndhub_details}</BlueText>
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
              <BlueButton
                testID="Create"
                title={loc.wallets.add_create}
                disabled={!selectedWalletType || (selectedWalletType === Chain.OFFCHAIN && (walletBaseURI ?? '').trim().length === 0)}
                onPress={createWallet}
              />
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

WalletsAdd.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, title: loc.wallets.add_title }),
);

const styles = StyleSheet.create({
  createButton: {
    flex: 1,
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
});

export default WalletsAdd;
