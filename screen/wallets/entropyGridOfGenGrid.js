import React, { useState } from 'react';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';
import { Alert, View, Text, StyleSheet, I18nManager } from 'react-native';
import { AutoComplete } from 'react-native-element-textinput';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { SafeBlueArea, BlueButton } from '../../BlueComponents';
import { generateSeedGrid, wordList, regenerateSeedGrid } from '../../class/border-wallet-grid';
import { PageTypes } from './entropyGrid';

const EntropyGridOfGenGrid = () => {
  const { navigate, goBack } = useNavigation();
  const { wallet, entropyType, pageType } = useRoute().params;
  const { colors } = useTheme();
  const [seedValues, setSeedValues] = useState(Array(12).fill(''));
  const [gridCells, setGridCells] = useState([]);
  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    subtitle: {
      color: colors.foregroundColor,
    },
  });

  const handleGenNewButton = async () => {
    // just 128bit
    const { cells, seed } = await generateSeedGrid(entropyType);
    seed && setSeedValues(seed?.split(' '));
    cells && setGridCells(cells);
  };

  const handleCancelButton = () => {
    goBack();
  };

  const handleOKButton = () => {
    if (seedValues && seedValues.every(Boolean) && seedValues.every(x => wordList.includes(x))) {
      let cells = gridCells;

      // just 128bit
      if (pageType !== PageTypes.CREATE) {
        const { cells: importCells, error } = regenerateSeedGrid(seedValues);
        if (error) {
          Alert.alert('Warning', error);
        } else {
          importCells && (cells = importCells);
        }
      }

      navigate('EntropyGrid', {
        wallet,
        entropyType,
        pageType,
        newGridSeed: seedValues,
        newGridCells: cells,
      });
    } else {
      Alert.alert('Warning', loc.entropy_grid.generate_seed_ok_tips);
    }
  };

  return (
    <SafeBlueArea style={stylesHook.flex}>
      <View style={styles.please}>
        <Text style={[styles.subtitle, stylesHook.subtitle]}> {loc.entropy_grid.generate_seed_subtitle} </Text>
      </View>
      <View style={styles.container}>
        {[0, 1].map(x => (
          <View key={x} style={styles.column}>
            {Array(6)
              .fill(undefined)
              .map((_, i) => {
                const idx = x * 6 + i;
                return (
                  <AutoComplete
                    key={idx}
                    value={seedValues[idx]}
                    data={wordList}
                    style={styles.autoInput}
                    inputStyle={styles.inputStyle}
                    labelStyle={styles.labelStyle}
                    placeholderStyle={styles.placeholderStyle}
                    textErrorStyle={styles.textErrorStyle}
                    label={`${idx + 1}.`}
                    onChangeText={val => (seedValues[idx] = val.trim().toLowerCase())}
                    readOnly={pageType === PageTypes.CREATE}
                    showIcon={pageType !== PageTypes.CREATE}
                  />
                );
              })}
          </View>
        ))}
      </View>
      <View style={styles.bottom}>
        <BlueButton
          testID="EntropyGridSeedGenNew"
          onPress={handleGenNewButton}
          title={loc.entropy_grid.generate_new}
          disabled={pageType !== PageTypes.CREATE}
        />
        <BlueButton testID="EntropyGridSeedCancel" onPress={handleCancelButton} title={loc.entropy_grid.cancel} />
        <BlueButton testID="EntropyGridSeedOK" onPress={handleOKButton} title={loc.entropy_grid.ok} />
      </View>
    </SafeBlueArea>
  );
};

EntropyGridOfGenGrid.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({
    ...opts,
    title: loc.entropy_grid.generate_seed_title,
  }),
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '80%',
  },
  column: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtitle: {
    marginVertical: 8,
    fontSize: 14,
    fontWeight: '500',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    paddingHorizontal: 16,
  },
  autoInput: {
    height: 60,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  inputStyle: { fontSize: 16 },
  labelStyle: { fontSize: 14 },
  placeholderStyle: { fontSize: 16 },
  textErrorStyle: { fontSize: 16 },
});

export default EntropyGridOfGenGrid;
