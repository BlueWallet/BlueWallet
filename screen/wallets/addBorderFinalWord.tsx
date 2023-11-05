import React, { useContext, Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import Biometric from '../../class/biometrics';

import { BlueButton, BlueSpacing20, BlueText, BlueAutocomplete } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Wallet } from '../../class';
import loc from '../../loc';
import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

const A = require('../../blue_modules/analytics');

const WalletsAddBorderFinalWord = () => {
  const { addWallet, saveToDisk, sleep, wallets } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletLabel, seedPhrase, importing, walletID } = useRoute().params;

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
    await sleep(100);
    try {
      if (!walletID) {
        const w = new HDSegwitBech32Wallet();
        w.setLabel(walletLabel);

        w.setSecret(seedPhrase.join(' ') + ' ' + textBoxValue);

        addWallet(w);
        await saveToDisk();
        A(A.ENUM.CREATED_WALLET);
      } else {
        const wallet = wallets.find(w => w.getID() === walletID);
        const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

        if (isBiometricsEnabled) {
          if (!(await Biometric.unlockWithBiometrics())) {
            alert(loc.border.memory_error_unlocking);
            return;
          }
        }

        const secret = wallet.getSecret();
        if (secret === seedPhrase.join(' ') + ' ' + textBoxValue) {
          alert(loc.border.memory_success);
        } else {
          alert(loc.border.memory_failure);
        }
      }

      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      navigation.popToTop();
      navigation.goBack();
    } catch (e) {
      alert(e.message);
      console.log('create border wallet error', e);
    }
  };

  const possibleWords = generateChecksumWords(seedPhrase.join(' '));

  let textBoxValue = '';

  const textChanged = text => {
    textBoxValue = text;
    if (possibleWords.indexOf(text) >= 0) {
      continueFooter.current.setEnabled(true);
    } else {
      continueFooter.current.setEnabled(false);
    }
  };

  const continueFooter = React.createRef();

  return (
    <View style={[styles.root, stylesHook.root]}>
      <View style={styles.wrapBox}>
        <BlueSpacing20 />
        <Text style={[styles.textdesc, stylesHook.textdesc]}>
          {loc.border.selected_words}
          <Text style={[styles.textdescBold, stylesHook.textdesc]}>{' ' + seedPhrase.join(' ')}</Text>
        </Text>
        <BlueSpacing20 />
        <BlueAutocomplete
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

class ContinueFooter extends Component {
  constructor(props) {
    super(props);
    this.state = { disable: true };
    this.setEnabled = this.setEnabled.bind(this);
  }

  setEnabled(sel) {
    this.setState({ disable: !sel });
  }

  render() {
    return (
      <BlueButton
        onPress={this.props.onContinue}
        title={this.props.importing ? loc.border.import : loc.border.create}
        disabled={this.state.disable}
      />
    );
  }
}

WalletsAddBorderFinalWord.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, title: loc.border.choose_final_word }),
);

export default WalletsAddBorderFinalWord;
