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
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

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
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

const WalletsAddBorderStep2 = () => {
  const { addWallet, saveToDisk, isElectrumDisabled, isAdvancedModeEnabled, sleep } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, words, importing, walletID } = useRoute().params;

  const [isLoading, setIsLoading] = useState(false);
  
  const selectedWords = useRef([]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });
  
  const headers = [];
  for (let i = 0; i < 16; i++) {
    headers.push(React.createRef());
  }
  
  const rownums = [];
  for (let i = 0; i < 128; i++) {
    rownums.push(React.createRef());
  }
  
  const items = [];
  for (let i = 0; i < 128; i++) {
    let curr = [];
    for (let j = 0; j < 16; j++) {
      curr.push({id: j, ind: (i*16) + j, word: words[(i*16) + j], title: words[(i*16) + j].substr(0, 4), cell: React.createRef()});
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
      rownums[(box.ind - box.ind % 16) / 16].current.setSelected(true);
      headers[box.ind % 16].current.setSelected(true);
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
    navigation.navigate('WalletsAddBorderFinalWord', { walletLabel, seedPhrase: seedSend, importing, walletID: walletID });
  };
  
  const onClear = () => {
    for (let i = 0; i < selectedWords.current.length; i++) {
      selectedWords.current[i].cell.current.setSelected(false);
    }
    for (let i = 0; i < rownums.length; i++) {
      if (rownums[i].current.isSelected()) rownums[i].current.setSelected(false);
    }
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].current.isSelected()) headers[i].current.setSelected(false);
    }
    selectedWords.current.length = 0;
    footer.current.stateChange({enableClear: false, enableContinue: false});
  };
  
  const AnimatedVirtualizedList = Animated.createAnimatedComponent(VirtualizedList);
  return (
    <View style={[styles.root, stylesHook.root]}>
    <View style={styles.wrapBox}>
      <BlueText style={{
        fontWeight: 'bold',
        fontSize: 30,
      }}>{!importing ? "Choose 11 or 23 boxes (2/3)" : "Enter your 11 or 23 box pattern"}</BlueText>
      {!importing ? <BlueText
        adjustsFontSizeToFit
        style={{
          fontSize: 15
        }}
      >
        {"You need to memorize your selected pattern in order, and the position on the grid where it's located. You do not need to memorize the words themselves."}
      </BlueText> : null}
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
              return (<BorderWalletHeaderCell key={item.id} text={item.id+1} ref={rownums[item.id]}/>);
            }}
            keyExtractor={item => item.id}
            getItemCount={() => items.length}
            getItem={(data, index) => items[index]}
          
          />
        </View>
        <ScrollView style={{flex: 1}} horizontal={true}>
          <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', height: styles.gridBoxStyle.height}}>{[...Array(16)].map((x, i) =>
              <BorderWalletHeaderCell key={i} text={(i + 10).toString(36).toUpperCase()} ref={headers[i]}/>
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
  import: {
    marginVertical: 24,
  },
  gridBoxStyle: {
    height: 24,
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5
  }
});

class BorderWalletHeaderCell extends Component {
  constructor(props) {
    super(props);
    this.state = { selected: false };
    this.setSelected = this.setSelected.bind(this);
    this.isSelected = this.isSelected.bind(this);
  }
  
  isSelected() {
    return this.state.selected;
  }

  setSelected(sel) {
    this.setState({selected: sel});
  }

  render() {
    return (
      <View style={[styles.gridBoxStyle, {backgroundColor: this.state.selected ? "#004A99" : "#00000030"}]}><Text style={this.state.selected ? {color: "#ffffff"} : []}>{this.props.text}</Text></View>
    );
  }
}

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
      <TouchableOpacity onPress={() => clickGrid(box)}><View style={[styles.gridBoxStyle, {flex: 1, flexGrow: 0, flexBasis: 'auto', backgroundColor: this.state.selected ? "#007AFF" : "#ffffff00"}]}><Text style={this.state.selected ? {color: "#ffffff"} : []}>{this.state.selected ? this.props.selectedWords.indexOf(box)+1 : box.title}</Text></View></TouchableOpacity>
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
