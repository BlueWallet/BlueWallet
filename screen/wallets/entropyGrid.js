import React, { useState, useEffect } from 'react';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';
import { Alert, View, Text, ScrollView, StyleSheet, I18nManager } from 'react-native';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { SafeBlueArea, BlueButton } from '../../BlueComponents';
import { saveGrid, wordList, getCellsByLoadingPdf } from '../../class/border-wallet-grid';
import EntropyGridTable from './entropyGridTable';
import { BorderWallet } from '../../class';

export const PageTypes = Object.freeze({
  CREATE: 0,
  IMPORT: 1,
  CHECK: 2,
});

const EntropyGrid = () => {
  const { navigate, goBack } = useNavigation();
  const { wallet, entropyType, pageType, newGridSeed, newGridCells } = useRoute().params;
  const { colors } = useTheme();
  const [patternOfGrid, setPatternOfGrid] = useState({});
  const [gridCells, setGridCells] = useState(Array(16 * 24).fill(''));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gridSeed, setGridSeed] = useState([]);
  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    pleaseText: {
      color: colors.foregroundColor,
    },
  });

  useEffect(() => {
    handleClearSelectionButton();
    newGridCells && setGridCells(newGridCells);
    newGridSeed && setGridSeed(newGridSeed);
    if (newGridCells && newGridCells.length === 2048 && pageType === PageTypes.CREATE) {
      saveGrid(newGridCells, newGridSeed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newGridCells, newGridSeed]);

  const handleLoadPdfButton = async () => {
    const { cells } = await getCellsByLoadingPdf();
    cells && cells.length === 2048 && setGridCells(cells);
  };

  const handleGenGridButton = () => {
    navigate('EntropyGridOfGenGrid', {
      wallet,
      entropyType,
      pageType,
    });
  };

  const handleClearSelectionButton = () => {
    Object.keys(patternOfGrid).forEach(x => patternOfGrid[x](false));
    setPatternOfGrid({});
  };

  const handleCancelButton = () => {
    goBack();
  };

  const handleOKButton = () => {
    const patternWords = Object.keys(patternOfGrid);
    if (patternWords.length !== 11 && patternWords.length !== 23) {
      Alert.alert(loc.entropy_grid.warning, loc.entropy_grid.ok_tips);
    } else {
      navigate('EntropyGridOfFinalWord', {
        patternWords: patternWords.map(x => wordList.find(y => y.startsWith(x))),
        wallet,
        pageType,
      });
    }
  };

  return (
    <SafeBlueArea style={stylesHook.flex}>
      <ScrollView contentContainerStyle={styles.flex} testID="EntropyGirdScrollView">
        <View style={styles.please}>
          <Text style={[styles.pleaseText, stylesHook.pleaseText]}> {loc.entropy_grid.text} </Text>
        </View>
        <View style={styles.list}>
          <ScrollView contentContainerStyle={styles.flex}>
            <EntropyGridTable pattern={patternOfGrid} setPattern={setPatternOfGrid} cellsData={gridCells} />
          </ScrollView>
        </View>
        <View style={styles.bottom}>
          <View style={styles.column}>
            <BlueButton
              testID="EntropyGridLoadPdf"
              onPress={handleLoadPdfButton}
              title={loc.entropy_grid.load_pdf}
              disabled={pageType === PageTypes.CREATE}
            />
            <BlueButton
              testID="EntropyGridGenGrid"
              onPress={handleGenGridButton}
              title={loc.entropy_grid.generate_grid}
              disabled={entropyType === BorderWallet.EntropyType.MAX}
            />
            <BlueButton testID="EntropyGridClearSelection" onPress={handleClearSelectionButton} title={loc.entropy_grid.clear_selection} />
          </View>
          <View style={styles.column}>
            <BlueButton testID="EntropyGridCancel" onPress={handleCancelButton} title={loc.entropy_grid.cancel} />
            <BlueButton testID="EntropyGridOK" onPress={handleOKButton} title={loc.entropy_grid.ok} />
          </View>
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

EntropyGrid.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({
    ...opts,
    title: loc.entropy_grid.title,
  }),
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: 'space-around',
  },
  please: {
    // flexGrow: 1,
    paddingHorizontal: 16,
  },
  list: {
    flexGrow: 2,
    paddingHorizontal: 16,
    height: '40%',
  },
  bottom: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 10,
  },
  pleaseText: {
    marginVertical: 8,
    fontSize: 14,
    fontWeight: '500',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  column: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
});

export default EntropyGrid;
