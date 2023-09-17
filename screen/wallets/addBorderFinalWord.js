import React, { useContext, useRef, useState, Component } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Image,
  FlatList,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  findNodeHandle,
  VirtualizedList,
  Animated
} from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import createHash from 'create-hash';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import Biometric from '../../class/biometrics';

import {
  BlueButton,
  BlueButtonLink,
  BlueFormMultiInput,
  BlueSpacing10,
  BlueSpacing20,
  BlueText,
  BlueTextCentered,
  BlueAutocomplete,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Wallet } from '../../class';
import loc from '../../loc';
import * as bip39 from 'bip39';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

const A = require('../../blue_modules/analytics');

const WalletsAddBorderFinalWord = () => {
  const { addWallet, saveToDisk, isElectrumDisabled, isAdvancedModeEnabled, sleep, wallets } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, seedPhrase, importing, walletID } = useRoute().params;

  const [isLoading, setIsLoading] = useState(false);
  
  const selectedWords = useRef([]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    },
  });
  
  const onContinue = async () => {
    if (possibleWords.indexOf(textBoxValue) < 0) return;
    setIsLoading(true);
    await sleep(100);
    try {
      if (!walletID) {
        let w = new HDSegwitBech32Wallet();
        w.setLabel(walletLabel);
      
        w.setSecret(seedPhrase.join(" ") + " " + textBoxValue);
      
        addWallet(w);
        await saveToDisk();
        A(A.ENUM.CREATED_WALLET);
      } else {
        const wallet = wallets.find(w => w.getID() === walletID);
        const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

        if (isBiometricsEnabled) {
          if (!(await Biometric.unlockWithBiometrics())) {
	        alert("Could not unlock wallet.");
	        return;
          }
        }
      
        let secret = wallet.getSecret();
        if (secret == (seedPhrase.join(" ") + " " + textBoxValue)) {
          alert("Success, your memory is correct!");
        } else {
          alert("Wallets do NOT match.");
        }
      }

      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      navigation.popToTop();
      navigation.goBack();
    } catch (e) {
      setIsLoading(false);
      alert(e.message);
      console.log('create border wallet error', e);
    }
  };
  
  function binarySearch(arr, el, compare_fn) {
    let m = 0;
    let n = arr.length - 1;
    while (m <= n) {
      let k = (n + m) >> 1;
      let cmp = compare_fn(el, arr[k]);
      if (cmp > 0) {
        m = k + 1;
      } else if(cmp < 0) {
        n = k - 1;
      } else {
        return k;
      }
    }
    return ~m;
  }
  
  if((seedPhrase.length + 1) % 3 > 0) {
    throw new Exception("Previous word list size must be multiple of three words, less one.");
    }
  
  let wordList = bip39.wordlists[bip39.getDefaultWordlist()];
  
  let concatLenBits = seedPhrase.length * 11;
  let concatBits = new Array(concatLenBits);
  let wordindex = 0;
  for (let i = 0; i < seedPhrase.length; i++) {
    let word = seedPhrase[i];
    let ndx = binarySearch(wordList, word, (el, test) => { return (el == test ? 0 : (el > test) ? 1 : -1); });
    // Set the next 11 bits to the value of the index.
    for (let ii = 0; ii < 11; ++ii) {
      concatBits[(wordindex * 11) + ii] = (ndx & (1 << (10 - ii))) != 0;
    }
    ++wordindex;
  }

  let checksumLengthBits = (concatLenBits + 11) / 33;
  let entropyLengthBits = (concatLenBits + 11) - checksumLengthBits;
  let varyingLengthBits = entropyLengthBits - concatLenBits;

  let numPermutations = varyingLengthBits**2;
  let bitPermutations = new Array(numPermutations);

  for (let i = 0; i < numPermutations; i++) {
    if (bitPermutations[i] == undefined || bitPermutations[i] == null) bitPermutations[i] = new Array(varyingLengthBits);
    for (let j = 0; j < varyingLengthBits; j++) {
      bitPermutations[i][j] = ((i >> j) & 1) == 1;
    }
  }

  let possibleWords = [];
  for(let i = 0; i < bitPermutations.length; i++) {
    let bitPermutation = bitPermutations[i];
    let entropyBits = new Array(concatLenBits + varyingLengthBits);
    entropyBits.splice(0, 0, ...concatBits);
    entropyBits.splice(concatBits.length, 0, ...bitPermutation.slice(0, varyingLengthBits));

    let entropy = new Array(entropyLengthBits / 8);
    for(let ii = 0; ii < entropy.length; ++ii) {
      for(let jj = 0; jj < 8; ++jj) {
        if(entropyBits[(ii * 8) + jj]) {
          entropy[ii] |= 1 << (7 - jj);
        }
      }
    }

    let hash = createHash('sha256').update(entropy).digest(); //TODO
    
    let hashBits = new Array(hash.length * 8);
    for (let iq = 0; iq < hash.length; ++iq)
      for (let jq = 0; jq < 8; ++jq)
        hashBits[(iq * 8) + jq] = (hash[iq] & (1 << (7 - jq))) != 0;

    let wordBits = new Array(11);
    wordBits.splice(0, 0, ...bitPermutation.slice(0, varyingLengthBits));
    wordBits.splice(varyingLengthBits, 0, ...hashBits.slice(0, checksumLengthBits));

    let index = 0;
    for(let j = 0; j < 11; ++j) {
      index <<= 1;
      if(wordBits[j]) {
        index |= 0x1;
      }
    }

    possibleWords.push(wordList[index]);
  }
  
  let textBoxValue = "";
  
  const textChanged = (text) => {
    
    textBoxValue = text;
    if (possibleWords.indexOf(text) >= 0) {
      continueFooter.current.setEnabled(true);
    } else {
      continueFooter.current.setEnabled(false);
    }
    
  }
  
  const continueFooter = React.createRef();

  return (
    <View style={[styles.root, stylesHook.root]}>
    <View style={styles.wrapBox}>
      <BlueSpacing20 />
      <Text style={[styles.textdesc, stylesHook.textdesc]}>
        Your selected words (do not save these):
        <Text style={[styles.textdescBold, stylesHook.textdesc]}>
          {" " + seedPhrase.join(" ")}
        </Text>
      </Text>
      <BlueSpacing20 />
      <BlueAutocomplete
        value={""}
        style={[]}
        containerStyle={{flex: 1}}
        placeholder="Final word"
        data={possibleWords}
        onChange={textChanged}
      />
      <BlueSpacing20 />
      {!importing ? <BlueText
        style={{
          fontSize: 15
        }}
      >
        {"To recap, you need to:\n        - Memorize:\n                - The order, location, and shape of your pattern\n                - The final word\n        - Store:\n                - Your grid PDF or grid seed phrase (from the first page)"}
      </BlueText> : null}
      <BlueSpacing20 />
      <View style={styles.buttonBottom}>
        <ContinueFooter onContinue={onContinue} ref={continueFooter} importing={importing} />
      </View>
    </View>
    
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  wrapBox: {
    flexGrow: 1,
    flexBasis: 0,
    overflow: 'hidden',
  },
  buttonBottom: {
    flexGrow: 0,
    flexBasis: 'auto',
    marginBottom: 20,
    justifyContent: 'flex-end',
  },
  textdesc: {
    fontWeight: '500',
    alignSelf: 'center',
    textAlign: 'center',
  },
  textdescBold: {
    fontWeight: '700',
    alignSelf: 'center',
    textAlign: 'center',
  },
});

class ContinueFooter extends Component {
  constructor(props) {
    super(props);
    this.state = { disable: true };
    this.setEnabled = this.setEnabled.bind(this);
  }

  setEnabled(sel) {
  this.setState({disable: !sel});
  }
  
  render() { return (
    <BlueButton onPress={this.props.onContinue} title={this.props.importing ? "Import wallet" : "Create wallet"} disabled={this.state.disable} />
  ); }
  
}

WalletsAddBorderFinalWord.navigationOptions = navigationStyle({
  gestureEnabled: false,
  swipeEnabled: false,
  headerHideBackButton: true,
}, opts => ({ ...opts, title: "Choose a final word (Step 3/3)" }));

export default WalletsAddBorderFinalWord;
