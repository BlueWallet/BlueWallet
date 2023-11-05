import React, { useContext, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, VirtualizedList, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../components/themes';

import { BlueButton, BlueButtonLink, BlueSpacing20, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

type BorderWalletHeaderCellProps = {
  text: string;
};
type BorderWalletHeaderCellState = {
  selected: boolean;
};
class BorderWalletHeaderCell extends React.Component<BorderWalletHeaderCellProps, BorderWalletHeaderCellState> {
  constructor(props: BorderWalletHeaderCellProps) {
    super(props);
    this.state = { selected: false } as BorderWalletHeaderCellState;
    this.setSelected = this.setSelected.bind(this);
    this.isSelected = this.isSelected.bind(this);
  }

  isSelected() {
    return (this.state as BorderWalletHeaderCellState).selected;
  }

  setSelected(sel: boolean) {
    this.setState({ selected: sel });
  }

  render() {
    return (
      <View style={[styles.gridBoxStyle, (this.state as BorderWalletHeaderCellState).selected ? styles.blue : styles.darkLight]}>
        <Text style={(this.state as BorderWalletHeaderCellState).selected ? styles.white : []}>
          {(this.props as BorderWalletHeaderCellProps).text}
        </Text>
      </View>
    );
  }
}

type BorderWalletCellProps = {
  selectedWords: string[];
  box: any;
  clickGrid: any;
};
type BorderWalletCellState = {
  selected: boolean;
};
class BorderWalletCell extends React.Component<BorderWalletCellProps, BorderWalletCellState> {
  constructor(props: BorderWalletCellProps) {
    super(props);
    this.state = { selected: false } as BorderWalletCellState;
    this.setSelected = this.setSelected.bind(this);
  }

  setSelected(sel: boolean) {
    this.setState({ selected: sel });
  }

  render() {
    const box = (this.props as BorderWalletCellProps).box;
    const clickGrid = (this.props as BorderWalletCellProps).clickGrid;
    return (
      <TouchableOpacity onPress={() => clickGrid(box)}>
        <View
          style={[
            styles.gridBoxStyle,
            styles.autoBasis,
            (this.state as BorderWalletCellState).selected ? styles.darkBlue : styles.transparent,
          ]}
        >
          <Text style={(this.state as BorderWalletCellState).selected ? styles.white : []}>
            {(this.state as BorderWalletCellState).selected 
              ? (this.props as BorderWalletCellProps).selectedWords.indexOf(box) + 1
              : box.title
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
}

type BorderWalletFooterProps = {
  isLoading: boolean;
  onContinue: any;
  onClear: any;
};
type BorderWalletFooterState = {
  enableClear: boolean;
  enableContinue: boolean;
};
class BorderWalletFooter extends React.Component<BorderWalletFooterProps, BorderWalletFooterState> {
  constructor(props: BorderWalletFooterProps) {
    super(props);
    this.state = { enableClear: false, enableContinue: false } as BorderWalletFooterState;
    this.stateChange = this.stateChange.bind(this);
  }

  stateChange(sel: BorderWalletFooterState) {
    this.setState(sel);
  }

  render() {
    return (
      <View style={styles.buttonBottom}>
        {!(this.props as BorderWalletFooterProps).isLoading ? (
          <BlueButtonLink
            style={styles.import}
            activeOpacity={!(this.state as BorderWalletFooterState).enableClear ? 1 : 0.7}
            title={loc.border.clear_selection}
            onPress={() => {
              if ((this.state as BorderWalletFooterState).enableClear) (this.props as BorderWalletFooterProps).onClear();
            }}
            disabled={!(this.state as BorderWalletFooterState).enableClear}
          />
        ) : null}
        {(this.props as BorderWalletFooterProps).isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton 
            title={loc.border.continue}
            onPress={(this.props as BorderWalletFooterProps).onContinue}
            disabled={!(this.state as BorderWalletFooterState).enableContinue}
          />
        )}
      </View>
    );
  }
}

const WalletsAddBorderStep2 = () => {
  const { sleep } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, words, importing, walletID } = useRoute().params as {
    walletLabel: string;
    words: string[];
    importing: boolean;
    walletID: string;
  };

  const [isLoading, setIsLoading] = useState(false);

  const selectedWords = useRef([]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  const headers: any[] = [];
  for (let i = 0; i < 16; i++) {
    headers.push(React.createRef());
  }

  const rownums: any[] = [];
  for (let i = 0; i < 128; i++) {
    rownums.push(React.createRef());
  }

  type GridColumn = {
    id: number;
    ind: number;
    word: string;
    title: string;
    cell: any;
  };
  type GridRow = {
    id: number;
    list: GridColumn[];
  };
  const items: GridRow[] = [];
  for (let i = 0; i < 128; i++) {
    const curr: GridColumn[] = [];
    for (let j = 0; j < 16; j++) {
      curr.push({ id: j, ind: i * 16 + j, word: words[i * 16 + j], title: words[i * 16 + j].substr(0, 4), cell: React.createRef() });
    }
    items.push({ id: i, list: curr });
  }

  const leftList = useRef(null);

  const offsetR = new Animated.Value(0);
  offsetR.addListener(({ value }) => {
    (leftList.current as any).scrollToOffset({ offset: value, animated: false });
  });

  const clickGrid = function (box: GridColumn) {
    const sw = selectedWords.current as GridColumn[];
    if (sw.indexOf(box) < 0) {
      sw.push(box);
      box.cell.current.setSelected(true);
      rownums[(box.ind - (box.ind % 16)) / 16].current.setSelected(true);
      headers[box.ind % 16].current.setSelected(true);
      footer.current?.stateChange({
        enableClear: true,
        enableContinue: sw.length === 11 || sw.length === 23,
      });
    }
  };

  const footer = React.createRef<BorderWalletFooter>();

  const onContinue = async () => {
    const sw = selectedWords.current as GridColumn[];
    setIsLoading(true);
    await sleep(100);
    const seedSend = [];
    for (let i = 0; i < sw.length; i++) {
      seedSend.push(sw[i].word);
    }
    navigation.navigate('WalletsAddBorderFinalWord', { walletLabel, seedPhrase: seedSend, importing, walletID });
  };

  const onClear = () => {
    const sw = selectedWords.current as GridColumn[];
    for (let i = 0; i < sw.length; i++) {
      sw[i].cell.current.setSelected(false);
    }
    for (let i = 0; i < rownums.length; i++) {
      if (rownums[i].current.isSelected()) rownums[i].current.setSelected(false);
    }
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].current.isSelected()) headers[i].current.setSelected(false);
    }
    sw.length = 0;
    footer.current?.stateChange({ enableClear: false, enableContinue: false });
  };

  const ke = function (item: unknown, index: number): string { 
    return (item as {id: number}).id.toString();
  };

  const AnimatedVirtualizedList = Animated.createAnimatedComponent(VirtualizedList);
  return (
    <View style={[styles.root, stylesHook.root]}>
      <View style={styles.wrapBox}>
        <BlueText style={styles.bigText}>{!importing ? loc.border.choose_boxes : loc.border.recover_boxes}</BlueText>
        {!importing ? (
          <BlueText adjustsFontSizeToFit style={styles.text}>
            {loc.border.instructions_memory}
          </BlueText>
        ) : null}
        <BlueSpacing20 />
        <Text style={styles.center}>{loc.border.scroll}</Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.flexRow}>
            <View>
              <View style={[styles.gridBoxStyle, styles.dark]} />
              <AnimatedVirtualizedList
                showsVerticalScrollIndicator={false}
                ref={leftList}
                initialNumToRender={128}
                scrollEnabled={false}
                renderItem={function (it: any): any {
                  const item = it.item as GridColumn;
                  return <BorderWalletHeaderCell key={item.id} text={(item.id + 1).toString()} ref={rownums[item.id]} />;
                }}
                keyExtractor={ke}
                getItemCount={() => items.length}
                getItem={(data, index) => items[index]}
              />
            </View>
            <ScrollView style={styles.flex} horizontal={true}>
              <View style={styles.flex}>
                <View style={styles.rowHeaderStyle}>
                  {[...Array(16)].map((x, i) => (
                    <BorderWalletHeaderCell key={i} text={(i + 10).toString(36).toUpperCase()} ref={headers[i]} />
                  ))}
                </View>
                <AnimatedVirtualizedList
                  style={styles.listStyle}
                  scrollEventThrottle={16}
                  initialNumToRender={128}
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: offsetR } } }], { useNativeDriver: true })}
                  renderItem={function (it: any): any {
                    const item = it.item as GridRow;
                    return (
                      <View key={item.id} style={styles.flexRowOnly}>
                        {item.list.map(function (box: GridColumn): any {
                          return (
                            <BorderWalletCell
                              key={box.id}
                              box={box}
                              clickGrid={clickGrid}
                              selectedWords={selectedWords.current}
                              ref={box.cell}
                            />
                          );
                        })}
                      </View>
                    );
                  }}
                  keyExtractor={ke}
                  getItemCount={() => items.length}
                  getItem={(data, index) => items[index]}
                />
              </View>
            </ScrollView>
          </View>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <BorderWalletFooter ref={footer} isLoading={isLoading} onContinue={onContinue} onClear={onClear} />
      )}
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
    borderWidth: 0.5,
  },
  bigText: {
    fontWeight: 'bold',
    fontSize: 30,
  },
  text: {
    fontSize: 15,
  },
  center: {
    textAlign: 'center',
  },
  flexRow: {
    flexDirection: 'row',
    flex: 1,
  },
  dark: {
    backgroundColor: '#00000070',
  },
  darkLight: {
    backgroundColor: '#00000030',
  },
  blue: {
    backgroundColor: '#004A99',
  },
  darkBlue: {
    backgroundColor: '#007AFF',
  },
  transparent: {
    backgroundColor: '#ffffff00',
  },
  flex: {
    flex: 1,
  },
  flexRowOnly: {
    flexDirection: 'row',
  },
  rowHeaderStyle: {
    flexDirection: 'row',
    height: 24,
  },
  listStyle: {
    flexGrow: 1,
    flexBasis: 0,
  },
  white: {
    color: '#ffffff',
  },
  autoBasis: {
    flex: 1,
    flexGrow: 0,
    flexBasis: 'auto',
  },
});

// @ts-ignore: Ignore
WalletsAddBorderStep2.navigationOptions = navigationStyle({
  headerTitle: null,
  gestureEnabled: false,
  swipeEnabled: false,
});

export default WalletsAddBorderStep2;
