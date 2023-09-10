import React, { useContext, useRef, useState, useEffect, Component } from 'react';
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
import { Icon, Header } from 'react-native-elements';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { getSystemName } from 'react-native-device-info';
import createHash from 'create-hash';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

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
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import loc from '../../loc';
import { SquareButton } from '../../components/SquareButton';
import BottomModal from '../../components/BottomModal';
import * as bip39 from 'bip39';
import { randomBytes } from '../../class/rng';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

const prompt = require('../../helpers/prompt');
const A = require('../../blue_modules/analytics');
const fs = require('../../blue_modules/fs');
const isDesktop = getSystemName() === 'Mac OS X';
const staticCache = {};

const WalletsAddBorderFinalWord = () => {
  const { addWallet, saveToDisk, isElectrumDisabled, isAdvancedModeEnabled, sleep } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, seedPhrase, importing } = useRoute().params;

  const [isLoading, setIsLoading] = useState(false);
  
  const selectedWords = useRef([]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    modalContent: {
      backgroundColor: colors.modal,
    },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    vaultKeyText: {
      color: colors.alternativeTextColor,
    },
    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wordText: {
      color: colors.labelText,
    },
    helpButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    helpButtonText: {
      color: colors.foregroundColor,
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
		let w = new HDSegwitBech32Wallet();
		w.setLabel(walletLabel);
		
		w.setSecret(seedPhrase.join(" ") + " " + textBoxValue);
		//TODO if (passphrase) w.setPassphrase(passphrase);
		
        addWallet(w);
        await saveToDisk();
        A(A.ENUM.CREATED_WALLET);
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
			{!importing ? <Text
				adjustsFontSizeToFit
				style={{
				  fontSize: 15,
				  color: "#000000"
				}}
			>
				{"To recap, you need to:\n				- Memorize:\n								- The order, location, and shape of your pattern\n								- The final word\n				- Store:\n								- Your grid PDF or grid seed phrase (from the first page)"}
			</Text> : null}
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
  textDestination: { fontWeight: '600' },
  modalContent: {
    paddingHorizontal: 22,
    paddingVertical: 32,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 400,
  },
  word: {
    width: 'auto',
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  secretContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  wordText: {
    fontWeight: 'bold',
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerText: { fontSize: 15, color: '#13244D' },
  alignItemsCenter: { alignItems: 'center' },
  squareButtonWrapper: { height: 50, width: 250 },
  helpButtonWrapper: {
    alignItems: 'flex-end',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
  },
  helpButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    flexDirection: 'row',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    justifyContent: 'space-between',
  },
  import: {
    marginVertical: 24,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  imageThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
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
