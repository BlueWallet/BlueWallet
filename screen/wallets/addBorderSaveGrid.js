import React, { useContext, useRef, useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Image,
  FlatList,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  BackHandler,
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
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {
  BlueButton,
  BlueButtonLink,
  BlueFormMultiInput,
  BlueSpacing10,
  BlueSpacing20,
  BlueText,
  BlueTextCentered,
  SafeBlueArea,
} from '../../BlueComponents';
import Privacy from '../../blue_modules/Privacy';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import loc from '../../loc';
import { SquareButton } from '../../components/SquareButton';
import BottomModal from '../../components/BottomModal';
import * as bip39 from 'bip39';
import { randomBytes } from '../../class/rng';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';

const prompt = require('../../helpers/prompt');
const A = require('../../blue_modules/analytics');
const fs = require('../../blue_modules/fs');
const isDesktop = getSystemName() === 'Mac OS X';
const staticCache = {};

const WalletsAddBorderSaveGrid = () => {
  const { addWallet, saveToDisk, isElectrumDisabled, isAdvancedModeEnabled, sleep } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, seedPhrase } = useRoute().params;

  const [isLoading, setIsLoading] = useState(false);

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
  });
  
  	function Mash() {
		let n = 0xefc8249d;
		const mash = function(data) {
			if (data) {
				data = data.toString();
				for (let i = 0; i < data.length; i++) {
					n += data.charCodeAt(i);
					let h = 0.02519603282416938 * n;
					n = h >>> 0;
					h -= n;
					h *= n;
					n = h >>> 0;
					h -= n;
					n += h * 0x100000000;
					// 2^32
				}
				return (n >>> 0) * 2.3283064365386963e-10;
				// 2^-32
			} else
				n = 0xefc8249d;
		};
		return mash;
	}

	function uheprng() {
		return (function() {
			const o = 48;
			let c = 1;
			let p = o;
			let s = new Array(o);
			let mash = Mash();
			function rawprng() {
				if (++p >= o)
					p = 0;
				const t = 1768863 * s[p] + c * 2.3283064365386963e-10;
				return (s[p] = t - (c = t | 0));
			}
			const random = function(range=2) {
				return Math.floor(range * (rawprng() + ((rawprng() * 0x200000) | 0) * 1.1102230246251565e-16));
			};
			random.cleanString = function(inStr='') {
				inStr = inStr.replace(/(^\s*)|(\s*$)/gi, '');
				inStr = inStr.replace(/[\x00-\x1F]/gi, '');
				inStr = inStr.replace(/\n /, '\n');
				return inStr;
			}
			;
			random.hashString = function(inStr='') {
				inStr = random.cleanString(inStr);
				mash(inStr);
				for (let i = 0; i < inStr.length; i++) {
					const k = inStr.charCodeAt(i);
					for (let j = 0; j < o; j++) {
						s[j] -= mash(k);
						if (s[j] < 0)
							s[j] += 1;
					}
				}
			}
			;
			random.initState = function() {
				mash();
				for (let i = 0; i < o; i++)
					s[i] = mash(' ');
				c = 1;
				p = o;
			}
			;
			random.done = function() {
				mash = null;
			}
			;
			random.initState();
			return random;
		}
		)();
	}
  
	const words = [...bip39.wordlists[bip39.getDefaultWordlist()]];
	const seed = seedPhrase;
	//shuffle
	const prng = uheprng();
	prng.initState();
	prng.hashString(seed);
	for (let i = words.length - 1; i > 0; i--) {
		const j = prng(i + 1);
		[words[i],words[j]] = [words[j], words[i]];
	}
	prng.done();   

  const handleBackButton = useCallback(async () => {
	setIsLoading(true);
	await sleep(100);
    navigation.navigate('WalletsAddBorderStep2', { walletLabel, seedPhrase, words });
	setIsLoading(false);
    return true;
  }, [navigation]);

  useEffect(() => {
    Privacy.enableBlur();
    setIsLoading(false);
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      Privacy.disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderSecret = () => {
    const component = [];
	let seedSplit = seedPhrase.split(/\s/);
    for (let i = 0; i < seedSplit.length; i++) {
      const text = `${i + 1}. ${seedSplit[i]}  `;
      component.push(
        <View style={[styles.word, stylesHook.word]} key={i}>
          <Text style={[styles.wortText, stylesHook.wortText]} textBreakStrategy="simple">
            {text}
          </Text>
        </View>,
      );
    }
    return component;
  };
  
  const handleShare = async () => {
	  
	  let html =`<style>header{width:100%;height:20px;counter-increment:page;text-align:center;font-family:Arial,Sans-Serif;font-size:10pt}.pgn::before{content:counter(page)}footer{margin-top:6px;width:100%;height:20px;text-align:center;font-family:Arial,Sans-Serif;font-size:10pt}.s1{font-weight:800;color:#505050;font-family:Arial,sans-serif;font-style:normal;text-decoration:none;font-size:7pt;text-indent:0;line-height:8.5pt;text-align:center}.s2{color:#505050;font-family:Arial,sans-serif;font-style:normal;text-decoration:none;font-size:7pt;text-indent:0;line-height:8.5pt;text-align:center}.tdnormal{width:33pt;border-top-style:solid;border-top-width:1pt;border-top-color:#c6c6c6;border-left-style:solid;border-left-width:1pt;border-left-color:#c6c6c6;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#c6c6c6;border-right-style:solid;border-right-width:1pt;border-right-color:#c6c6c6}.tdheader{background-color:#dbdbdb;width:33pt;border-top-style:solid;border-top-width:1pt;border-top-color:#c6c6c6;border-left-style:solid;border-left-width:1pt;border-left-color:#c6c6c6;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#c6c6c6;border-right-style:solid;border-right-width:1pt;border-right-color:#c6c6c6}tr{height:9pt}</style>`;
	  
	  let footer = `<footer>Recovery Phrase: ` + seedPhrase + `</footer>`;
	  
	  let header1 = `<header>Pt `;
	  let header2 = `/2 BWEG No.# ___________ Date: _____________ Checksum verified? Y/N Checksum calculator/method:________________</header>`;
	  
	  let tablepageheaderfooter = `<tr><td class="tdheader"><p class="s1"><br/></p></td><td class="tdheader"><p class="s1">A</p></td><td class="tdheader"><p class="s1">B</p></td><td class="tdheader"><p class="s1">C</p></td><td class="tdheader"><p class="s1">D</p></td><td class="tdheader"><p class="s1">E</p></td><td class="tdheader"><p class="s1">F</p></td><td class="tdheader"><p class="s1">G</p></td><td class="tdheader"><p class="s1">H</p></td><td class="tdheader"><p class="s1">I</p></td><td class="tdheader"><p class="s1">J</p></td><td class="tdheader"><p class="s1">K</p></td><td class="tdheader"><p class="s1">L</p></td><td class="tdheader"><p class="s1">M</p></td><td class="tdheader"><p class="s1">N</p></td><td class="tdheader"><p class="s1">O</p></td><td class="tdheader"><p class="s1">P</p></td><td class="tdheader"><p class="s1"><br/></p></td></tr>`;
	  
	  for (let n = 0; n < 2; n++) {
		html += header1 + (n + 1) + header2;
		html += `<table cellspacing=0 style=border-collapse:collapse;margin-left:5.5pt>`;
		html += tablepageheaderfooter;
		for (let i = 0; i < 64; i++) {
			let nr = n*64 + i;
			html += `<tr>`;
			let col = `<td class="tdheader"><p class="s1">` + (nr + 1).toString().padStart(3, '0') + `</p></td>`;
			html += col;
			for (let j = 0; j < 16; j++) {
				html += `<td class="tdnormal"><p class="s2">` + words[(nr*16) + j].substr(0, 4) + `</p></td>`;
			}
			html += col;
			html += `</tr>`;
		}
		html += tablepageheaderfooter;
		html += `</table>`;
		html += footer;
	  }
	  
		try {
			let options = {
			  html: html,
			  base64: true,
			};

			let file = await RNHTMLtoPDF.convert(options);
		  
			const shareOptions = {
			  title: 'Save file',
			  failOnCancel: false,
			  saveToFiles: true,
			  urls: ["data:application/pdf;base64," + file.base64],
			  filenames: ["BorderWalletEntropyGrid"]
			};

			const ShareResponse = await Share.open(shareOptions);
		} catch (error) {
			alert("Could not save file!");
		}
	  
  };

  return isLoading ? (
    <View style={[styles.loading, stylesHook.flex]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={stylesHook.flex}>
      <ScrollView contentContainerStyle={styles.flex} testID="PleaseBackupScrollView">
        <View style={styles.please}>
          <Text style={[styles.pleaseText, stylesHook.pleaseText]}>{"Please save this mnemonic and/or the grid PDF. You will need to use one of them to recover the wallet in the future. \nAlthough it cannot be used alone, the nature of a user-selected pattern means that a leaked grid is still a security risk -- If you suspect someone has access to these seed words or the grid PDF, you should still move your funds as soon as possible."}</Text>
        </View>
        <View style={styles.list}>
          <View style={styles.secret}>{renderSecret()}</View>
        </View>
		<View style={styles.bottom}>
		  <BlueButton onPress={handleShare} title={"Save Grid PDF ⇓"} />
		</View>
        <View style={styles.bottom}>
          <BlueButton onPress={handleBackButton} title={loc.pleasebackup.ok} />
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

WalletsAddBorderSaveGrid.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, title: "Creating border wallet (Step 1/3)" }),
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    justifyContent: 'space-around',
  },
  word: {
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  wortText: {
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 17,
  },
  please: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  list: {
    flexGrow: 8,
    paddingHorizontal: 16,
  },
  bottom: {
    flexGrow: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  pleaseText: {
    marginVertical: 16,
    fontSize: 16,
    fontWeight: '500',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  secret: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 14,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
});

export default WalletsAddBorderSaveGrid;
