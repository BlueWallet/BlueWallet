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
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {
  BlueButton,
  BlueButtonLink,
  BlueFormMultiInput,
  BlueSpacing10,
  BlueSpacing20,
  BlueText,
  BlueTextCentered,
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

const WalletsAddBorderStep2 = () => {
  const { addWallet, saveToDisk, isElectrumDisabled, isAdvancedModeEnabled, sleep } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, seedPhrase } = useRoute().params;

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
  
  const items = [];
  for (let i = 0; i < 128; i++) {
	
		let curr = [];
		for (let j = 0; j < 16; j++) {
			curr.push({id: j, word: words[(i*16) + j], title: words[(i*16) + j].substr(0, 4), cell: React.createRef()});
		}
		items.push({id: i, list: curr});
  }
  
  let leftList = useRef(null);
  
  const offsetR = new Animated.Value(0);
  offsetR.addListener(({ value }) => {
    leftList.current.scrollToOffset({ offset: value, animated: false });
  })
  
  const clickGrid = (box) => {

	if (selectedWords.current.indexOf(box) < 0) {
		selectedWords.current.push(box);
		box.cell.current.setSelected(true);
		footer.current.stateChange({enableClear: true, enableContinue: selectedWords.current.length == 11 || selectedWords.current.length == 23});
	}
	
  };
  
  const footer = React.createRef();
  
  const onContinue = async () => {
    setIsLoading(true);
    await sleep(100);
	let seedSend = [];
    for (let i = 0; i < selectedWords.current.length; i++) {
		seedSend.push(selectedWords.current[i].word);
	}
	navigation.navigate('WalletsAddBorderFinalWord', { walletLabel, seedPhrase: seedSend });
  };
  
  const onClear = () => {
    for (let i = 0; i < selectedWords.current.length; i++) {
		selectedWords.current[i].cell.current.setSelected(false);
	}
	selectedWords.current.length = 0;
	footer.current.stateChange({enableClear: false, enableContinue: false});
  };
  
  const AnimatedVirtualizedList = Animated.createAnimatedComponent(VirtualizedList);
  return (
    <View style={[styles.root, stylesHook.root]}>
		<View style={styles.wrapBox}>
			<Text
				adjustsFontSizeToFit
				style={{
				  fontWeight: 'bold',
				  fontSize: 30,
				  color: "#000000"
				}}
			>
				{"Choose 11 or 23 boxes (2/3)"}
			</Text>
			<Text
				adjustsFontSizeToFit
				style={{
				  fontSize: 15,
				  color: "#000000"
				}}
			>
				{"You need to memorize your selected pattern in order, and the position on the grid where it's located. You do not need to memorize the words themselves."}
			</Text>
			<BlueSpacing20 />
			<Text style={{textAlign: 'center'}}>{"Scroll ↓→"}</Text>
			{isLoading ? <ActivityIndicator/> : <View style={{flexDirection: 'row', flex: 1}}>
				<View>
					<View style={[styles.gridBoxStyle, {backgroundColor: "#00000070"}]}></View>
					<AnimatedVirtualizedList
						showsVerticalScrollIndicator={false}
						ref={leftList}
						initialNumToRender={128}
						scrollEnabled={false}
						renderItem={({item}) => {
							return (<View key={item.id} style={[styles.gridBoxStyle, {backgroundColor: "#00000030"}]}><Text>{item.id+1}</Text></View>);
						}}
						keyExtractor={item => item.id}
						getItemCount={() => items.length}
						getItem={(data, index) => items[index]}
					
					/>
				</View>
				<ScrollView style={{flex: 1}} horizontal={true}>
					<View style={{flex: 1}}>
						<View style={{flexDirection: 'row', height: styles.gridBoxStyle.height}}>{[...Array(16)].map((x, i) =>
							<View key={i} style={[styles.gridBoxStyle, {backgroundColor: "#00000030", flex: 1, flexGrow: 0, flexBasis: 'auto'}]}><Text>{(i + 10).toString(36).toUpperCase()}</Text></View>
						)}</View>
						<AnimatedVirtualizedList
							style={{flexGrow: 1, flexBasis: 0}}
							scrollEventThrottle={16}
							initialNumToRender={128}
							onScroll={Animated.event(
								[{ nativeEvent: { contentOffset: { ['y']: offsetR } } }],
								{ useNativeDriver: true }
							)}
							renderItem={({item}) => {
								return (<View key={item.id} style={{flexDirection: 'row'}}>{item.list.map((box) => {
									return (
										<BorderWalletCell key={box.id} box={box} clickGrid={clickGrid} selectedWords={selectedWords.current} ref={box.cell} />
									);
								})}</View>);
							}}
							keyExtractor={item => item.id}
							getItemCount={() => items.length}
							getItem={(data, index) => items[index]}
						/>
					</View>
				</ScrollView>
			</View>}
		</View>
		{isLoading ? <ActivityIndicator/> : <BorderWalletFooter ref={footer} isLoading={isLoading} onContinue={onContinue} onClear={onClear}/>}
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
  gridBoxStyle: {
	height: 24,
	width: 56,
	justifyContent: 'center',
	alignItems: 'center',
	borderWidth: 0.5
  }
});

class BorderWalletCell extends Component {
  constructor(props) {
    super(props);
    this.state = { selected: false };
    this.setSelected = this.setSelected.bind(this);
  }

  setSelected(sel) {
	this.setState({selected: sel});
  }

  render() {
	let box = this.props.box;
	let clickGrid = this.props.clickGrid;
    return (
      <TouchableOpacity onPress={() => clickGrid(box)}><View style={[styles.gridBoxStyle, {backgroundColor: this.state.selected ? "#007AFF" : "#ffffff00"}]}><Text style={this.state.selected ? {color: "#ffffff"} : []}>{this.state.selected ? this.props.selectedWords.indexOf(box)+1 : box.title}</Text></View></TouchableOpacity>
    );
  }
}

class BorderWalletFooter extends Component {
	constructor(props) {
    super(props);
    this.state = { enableClear: false, enableContinue: false };
    this.stateChange = this.stateChange.bind(this);
  }

  stateChange(sel) {
	this.setState(sel);
  }
	
	render() { return (
    <View style={styles.buttonBottom}>
	  {!this.props.isLoading ? <BlueButtonLink style={styles.import} activeOpacity={!this.state.enableClear ? 1 : 0.7} title="Clear selection" onPress={() => { if (this.state.enableClear) this.props.onClear() }} disabled={!this.state.enableClear} /> : null}
      {this.props.isLoading ? <ActivityIndicator /> : <BlueButton title={"Continue"} onPress={this.props.onContinue} disabled={!this.state.enableContinue} />}
    </View>
	); }
	
}

WalletsAddBorderStep2.navigationOptions = navigationStyle({
  headerTitle: null,
  gestureEnabled: false,
  swipeEnabled: false,
});

export default WalletsAddBorderStep2;
