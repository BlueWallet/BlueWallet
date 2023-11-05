import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, ScrollView, I18nManager, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../components/themes';

import { getShuffledEntropyWords } from '../../class/borderwallet-entropy-grid';

import { BlueButton, SafeBlueArea } from '../../BlueComponents';
import Privacy from '../../blue_modules/Privacy';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import alert from '../../components/Alert';

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';

const WalletsAddBorderSaveGrid = () => {
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, seedPhrase } = useRoute().params as { 
    walletLabel: string;
    seedPhrase: string;
  };

  const [isLoading, setIsLoading] = useState(false);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wordText: {
      color: colors.labelText,
    },
  });

  const words = getShuffledEntropyWords(seedPhrase);

  const handleBackButton = useCallback(
    function(): boolean {
      setIsLoading(true);
      setTimeout( function () {
        navigation.navigate('WalletsAddBorderStep2', { walletLabel, words, importing: false });
        setIsLoading(false); }
      , 100);

      return true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [navigation]);

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
    const seedSplit = seedPhrase.split(/\s/);
    for (let i = 0; i < seedSplit.length; i++) {
      const text = `${i + 1}. ${seedSplit[i]}  `;
      component.push(
        <View style={[styles.word, stylesHook.word]} key={i}>
          <Text style={[styles.wordText, stylesHook.wordText]} textBreakStrategy="simple">
            {text}
          </Text>
        </View>,
      );
    }
    return component;
  };

  // This avoids having to import any other libraries for PDF exports. You win some, you lose some.
  const handleShare = async () => {
    let html = `<style>header{width:100%;height:20px;counter-increment:page;text-align:center;font-family:Arial,Sans-Serif;font-size:10pt}.pgn::before{content:counter(page)}footer{margin-top:6px;width:100%;height:20px;text-align:center;font-family:Arial,Sans-Serif;font-size:10pt}.s1{font-weight:800;color:#505050;font-family:Arial,sans-serif;font-style:normal;text-decoration:none;font-size:7pt;text-indent:0;line-height:8.5pt;text-align:center}.s2{color:#505050;font-family:Arial,sans-serif;font-style:normal;text-decoration:none;font-size:7pt;text-indent:0;line-height:8.5pt;text-align:center}.tdnormal{width:33pt;border-top-style:solid;border-top-width:1pt;border-top-color:#c6c6c6;border-left-style:solid;border-left-width:1pt;border-left-color:#c6c6c6;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#c6c6c6;border-right-style:solid;border-right-width:1pt;border-right-color:#c6c6c6}.tdheader{background-color:#dbdbdb;width:33pt;border-top-style:solid;border-top-width:1pt;border-top-color:#c6c6c6;border-left-style:solid;border-left-width:1pt;border-left-color:#c6c6c6;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#c6c6c6;border-right-style:solid;border-right-width:1pt;border-right-color:#c6c6c6}tr{height:9pt}</style>`;

    const footer = `<footer>Recovery Phrase: ` + seedPhrase + `</footer>`;

    const header1 = `<header>Pt `;
    const header2 = `/2 BWEG No.# ___________ Date: _____________ Checksum verified? Y/N Checksum calculator/method:________________</header>`;

    const tablepageheaderfooter = `<tr><td class="tdheader"><p class="s1"><br/></p></td><td class="tdheader"><p class="s1">A</p></td><td class="tdheader"><p class="s1">B</p></td><td class="tdheader"><p class="s1">C</p></td><td class="tdheader"><p class="s1">D</p></td><td class="tdheader"><p class="s1">E</p></td><td class="tdheader"><p class="s1">F</p></td><td class="tdheader"><p class="s1">G</p></td><td class="tdheader"><p class="s1">H</p></td><td class="tdheader"><p class="s1">I</p></td><td class="tdheader"><p class="s1">J</p></td><td class="tdheader"><p class="s1">K</p></td><td class="tdheader"><p class="s1">L</p></td><td class="tdheader"><p class="s1">M</p></td><td class="tdheader"><p class="s1">N</p></td><td class="tdheader"><p class="s1">O</p></td><td class="tdheader"><p class="s1">P</p></td><td class="tdheader"><p class="s1"><br/></p></td></tr>`;

    for (let n = 0; n < 2; n++) {
      html += header1 + (n + 1) + header2;
      html += `<table cellspacing=0 style=border-collapse:collapse;margin-left:5.5pt>`;
      html += tablepageheaderfooter;
      for (let i = 0; i < 64; i++) {
        const nr = n * 64 + i;
        html += `<tr>`;
        const col = `<td class="tdheader"><p class="s1">` + (nr + 1).toString().padStart(3, '0') + `</p></td>`;
        html += col;
        for (let j = 0; j < 16; j++) {
          html += `<td class="tdnormal"><p class="s2">` + words[nr * 16 + j].substr(0, 4) + `</p></td>`;
        }
        html += col;
        html += `</tr>`;
      }
      html += tablepageheaderfooter;
      html += `</table>`;
      html += footer;
    }

    try {
      const options = {
        html,
        base64: true,
      };

      const file = await RNHTMLtoPDF.convert(options);

      const shareOptions = {
        title: loc.border.save_file,
        failOnCancel: false,
        saveToFiles: true,
        urls: ['data:application/pdf;base64,' + file.base64],
        filenames: ['BorderWalletEntropyGrid'],
      };

      await Share.open(shareOptions);
    } catch (error) {
      alert(loc.border.save_file_error);
    }
  };

  return isLoading ? (
    <View style={styles.loading}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea>
      <ScrollView contentContainerStyle={styles.flex}>
        <View style={styles.please}>
          <Text style={styles.pleaseText}>{loc.border.backup_desc}</Text>
        </View>
        <View style={styles.list}>
          <View style={styles.secret}>{renderSecret()}</View>
        </View>
        <View style={styles.bottom}>
          <BlueButton onPress={handleShare} title={loc.border.backup_pdf} />
        </View>
        <View style={styles.bottom}>
          <BlueButton onPress={handleBackButton} title={loc.pleasebackup.ok} />
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

// @ts-ignore: Ignore
WalletsAddBorderSaveGrid.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, title: loc.border.creating }),
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
  wordText: {
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
