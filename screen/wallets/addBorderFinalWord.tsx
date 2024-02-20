import React, { useContext, useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../components/themes';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import Biometric from '../../class/biometrics';

import { BlueSpacing20, BlueText } from '../../BlueComponents';
import Button from '../../components/Button';
import Autocomplete from '../../components/Autocomplete';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Wallet } from '../../class';
import loc from '../../loc';
import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

const A = require('../../blue_modules/analytics');

type ContinueFooterProps = {
  onContinue: any;
  importing: boolean;
};
type ContinueFooterState = {
  disable: boolean;
};
class ContinueFooter extends React.Component<ContinueFooterProps, ContinueFooterState> {
  constructor(props: ContinueFooterProps) {
    super(props);
    this.state = { disable: true } as ContinueFooterState;
    this.setEnabled = this.setEnabled.bind(this);
  }

  setEnabled(sel: boolean) {
    this.setState({ disable: !sel });
  }

  render() {
    return (
      <Button
        onPress={(this.props as ContinueFooterProps).onContinue}
        title={(this.props as ContinueFooterProps).importing ? loc.border.import : loc.border.create}
        disabled={(this.state as ContinueFooterState).disable}
      />
    );
  }
}

const WalletsAddBorderFinalWord = () => {
  const { addWallet, saveToDisk, sleep, wallets } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation<any>();
  const { walletLabel, seedPhrase, importing, walletID } = useRoute().params as {
    walletLabel: string;
    seedPhrase: string[];
    importing: boolean;
    walletID: string;
  };

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textdesc: {
      color: colors.alternativeTextColor,
    },
  });

  const onContinue = async () => {
    if (textBoxValue.current === null || textBoxValue.current === undefined) return;
    const tBc = textBoxValue.current;
    if (possibleWords.indexOf(tBc) < 0) return;
    await sleep(100);
    try {
      if (!walletID) {
        const w: any = new HDSegwitBech32Wallet();
        w.setLabel(walletLabel);

        w.setSecret(seedPhrase.join(' ') + ' ' + tBc);

        addWallet(w);
        await saveToDisk();
        A(A.ENUM.CREATED_WALLET);
      } else {
        const wallet = wallets.find((w: any) => w.getID() === walletID);
        const isBiometricsEnabled = await (Biometric as any).isBiometricUseCapableAndEnabled();

        if (isBiometricsEnabled) {
          if (!(await (Biometric as any).unlockWithBiometrics())) {
            alert(loc.border.memory_error_unlocking);
            return;
          }
        }

        const secret = wallet.getSecret();
        if (secret === seedPhrase.join(' ') + ' ' + tBc) {
          alert(loc.border.memory_success);
        } else {
          alert(loc.border.memory_failure);
        }
      }

      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      navigation.popToTop();
      navigation.goBack();
    } catch (e: any) {
      alert(e.message);
      console.log('create border wallet error', e);
    }
  };

  const possibleWords = generateChecksumWords(seedPhrase.join(' ')) as string[];

  const textBoxValue = useRef<string>('');

  const textChanged = useCallback(
    function (text: string) {
      textBoxValue.current = text;
      if (possibleWords.indexOf(text) >= 0) {
        continueFooter.current?.setEnabled(true);
      } else {
        continueFooter.current?.setEnabled(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation],
  );

  const continueFooter = React.createRef<ContinueFooter>();

  return (
    <View style={[styles.root, stylesHook.root]}>
      <View style={styles.wrapBox}>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.border.selected_words}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>{' ' + seedPhrase.join(' ')}</Text>
        </Text>
        <BlueSpacing20 />
        <Autocomplete
          value=""
          style={[]}
          containerStyle={styles.flex}
          placeholder={loc.border.final_word}
          data={possibleWords}
          onChange={textChanged}
        />
        <BlueSpacing20 />
        {!importing ? <BlueText style={styles.textStyle}>{loc.border.instructions_recap}</BlueText> : null}
        <BlueSpacing20 />
        <View style={styles.buttonBottom}>
          <ContinueFooter onContinue={onContinue} ref={continueFooter} importing={importing} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  textStyle: {
    fontSize: 15,
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

// @ts-ignore: Ignore
WalletsAddBorderFinalWord.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, title: loc.border.choose_final_word }),
);

export default WalletsAddBorderFinalWord;
