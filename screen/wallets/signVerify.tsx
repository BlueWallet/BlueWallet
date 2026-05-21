import React, { useEffect, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ActivityIndicator, Keyboard, LayoutAnimation, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import BlueFormLabel from '../../components/BlueFormLabel';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { FButton, FContainer, FloatButtonsBottomFade } from '../../components/FloatButtons';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import { BlueSpacing10, BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';
import useWalletSubscribe from '../../hooks/useWalletSubscribe.tsx';

type SignVerifyRouteParams = {
  walletID: string;
  address: string;
};

const SignVerify = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sleep } = useStorage();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { address: _address, walletID } = useRoute<RouteProp<{ params: SignVerifyRouteParams }, 'params'>>().params;

  const [address, setAddress] = useState(_address);
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageHasFocus, setMessageHasFocus] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);

  const wallet = useWalletSubscribe(walletID);
  const isToolbarVisibleForAndroid = Platform.OS === 'android' && messageHasFocus && isKeyboardVisible;

  useEffect(() => {
    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setIsKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setIsKeyboardVisible(false),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const stylesHooks = StyleSheet.create({
    screen: {
      backgroundColor: colors.elevated,
    },
    text: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      color: colors.foregroundColor,
    },
  });

  const handleShare = () => {
    const baseUri = 'https://bluewallet.github.io/VerifySignature';
    const uri = `${baseUri}?a=${address}&m=${encodeURIComponent(message)}&s=${encodeURIComponent(signature)}`;
    Share.open({ message: uri }).catch(error => console.log(error));
  };

  const handleSign = async () => {
    setLoading(true);
    await sleep(10); // wait for loading indicator to appear
    let newSignature;
    try {
      newSignature = wallet.signMessage(message, address);
      setSignature(newSignature);
      setIsShareVisible(true);
    } catch (e: any) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ title: loc.errors.error, message: e.message });
    }

    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    await sleep(10); // wait for loading indicator to appear
    try {
      const res = wallet.verifyMessage(message, address, signature);
      presentAlert({
        title: res ? loc._.success : loc.errors.error,
        message: res ? loc.addresses.sign_signature_correct : loc.addresses.sign_signature_incorrect,
      });
      if (res) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      }
    } catch (e: any) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ title: loc.errors.error, message: e.message });
    }
    setLoading(false);
  };

  const handleFocus = (value: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessageHasFocus(value);
  };

  if (loading)
    return (
      <View style={[styles.screenRoot, stylesHooks.screen, styles.loading]}>
        <ActivityIndicator />
      </View>
    );

  const scrollBottomPad = isShareVisible && !isKeyboardVisible ? insets.bottom + 80 : undefined;

  return (
    <View style={[styles.screenRoot, stylesHooks.screen]}>
      <ScrollView
        automaticallyAdjustContentInsets
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.root, scrollBottomPad !== undefined && { paddingBottom: scrollBottomPad }]}
        style={styles.scroll}
      >
        {!isKeyboardVisible && (
          <>
            <BlueSpacing20 />
            <BlueFormLabel>{loc.addresses.sign_help}</BlueFormLabel>
            <BlueSpacing20 />
          </>
        )}

        <TextInput
          multiline
          textAlignVertical="top"
          blurOnSubmit
          placeholder={loc.addresses.sign_placeholder_address}
          placeholderTextColor="#81868e"
          value={address}
          onChangeText={t => setAddress(t.replace('\n', ''))}
          testID="SignVerifyAddress"
          style={[styles.text, stylesHooks.text]}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
        />
        <BlueSpacing10 />

        <TextInput
          multiline
          placeholder={loc.addresses.sign_placeholder_message}
          placeholderTextColor="#81868e"
          value={message}
          onChangeText={setMessage}
          testID="Message"
          inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
          style={[styles.text, styles.messageInput, stylesHooks.text]}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          scrollEnabled
          textAlignVertical="top"
          onFocus={() => handleFocus(true)}
          onBlur={() => handleFocus(false)}
        />
        <BlueSpacing10 />

        <TextInput
          multiline
          textAlignVertical="top"
          blurOnSubmit
          placeholder={loc.addresses.sign_placeholder_signature}
          placeholderTextColor="#81868e"
          value={signature}
          onChangeText={t => setSignature(t.replace('\n', ''))}
          testID="SignVerifySignature"
          style={[styles.text, stylesHooks.text]}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
        />
        <BlueSpacing40 />

        {!isKeyboardVisible && (
          <>
            <View style={styles.actionButtons}>
              <SecondButton onPress={handleVerify} title={loc.addresses.sign_verify} />
              <BlueSpacing20 />
              <Button onPress={handleSign} title={loc.addresses.sign_sign} />
            </View>
            <BlueSpacing10 />
          </>
        )}

        {Platform.select({
          ios: (
            <DoneAndDismissKeyboardInputAccessory
              onClearTapped={() => setMessage('')}
              onPasteTapped={text => {
                setMessage(text);
                Keyboard.dismiss();
              }}
            />
          ),
          android: isToolbarVisibleForAndroid && (
            <DoneAndDismissKeyboardInputAccessory
              onClearTapped={() => {
                setMessage('');
                Keyboard.dismiss();
              }}
              onPasteTapped={text => {
                setMessage(text);
                Keyboard.dismiss();
              }}
            />
          ),
        })}
      </ScrollView>

      {isShareVisible && !isKeyboardVisible && (
        <>
          <FloatButtonsBottomFade />
          <FContainer>
            <FButton
              onPress={handleShare}
              text={loc.multisig.share}
              icon={
                <View>
                  <Icon name="external-link" size={16} type="font-awesome" color={colors.buttonAlternativeTextColor} />
                </View>
              }
            />
          </FContainer>
        </>
      )}
    </View>
  );
};

export default SignVerify;

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  root: {
    flexGrow: 1,
  },
  text: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderRadius: 4,
    textAlignVertical: 'top',
  },
  messageInput: {
    minHeight: 80,
    maxHeight: 200,
  },
  actionButtons: {
    alignSelf: 'stretch',
    marginHorizontal: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
