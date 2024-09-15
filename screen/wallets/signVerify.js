import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { ActivityIndicator, Keyboard, LayoutAnimation, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@rneui/themed';
import Share from 'react-native-share';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueFormLabel, BlueSpacing10, BlueSpacing20, BlueSpacing40 } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import { FButton, FContainer } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';

const SignVerify = () => {
  const { colors } = useTheme();
  const { wallets, sleep } = useStorage();
  const { params } = useRoute();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [address, setAddress] = useState(params.address ?? '');
  const [message, setMessage] = useState(params.message ?? '');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageHasFocus, setMessageHasFocus] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);

  const wallet = wallets.find(w => w.getID() === params.walletID);
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
    root: {
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
    } catch (e) {
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
    } catch (e) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ title: loc.errors.error, message: e.message });
    }
    setLoading(false);
  };

  const handleFocus = value => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessageHasFocus(value);
  };

  if (loading)
    return (
      <View style={[stylesHooks.root, styles.loading]}>
        <ActivityIndicator />
      </View>
    );

  return (
    <ScrollView
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.root}
      style={[styles.root, stylesHooks.root]}
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
        testID="Signature"
        style={[styles.text, stylesHooks.text]}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        editable={!loading}
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
        testID="Signature"
        style={[styles.text, stylesHooks.text]}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        editable={!loading}
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
        style={[styles.flex, styles.text, styles.textMessage, stylesHooks.text]}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        editable={!loading}
        onFocus={() => handleFocus(true)}
        onBlur={() => handleFocus(false)}
      />
      <BlueSpacing40 />

      {isShareVisible && !isKeyboardVisible && (
        <>
          <FContainer inline>
            <FButton
              onPress={handleShare}
              text={loc.multisig.share}
              icon={
                <View style={styles.buttonsIcon}>
                  <Icon name="external-link" size={16} type="font-awesome" color={colors.buttonAlternativeTextColor} />
                </View>
              }
            />
          </FContainer>
          <BlueSpacing10 />
        </>
      )}

      {!isKeyboardVisible && (
        <>
          <FContainer inline>
            <FButton onPress={handleSign} text={loc.addresses.sign_sign} disabled={loading} />
            <FButton onPress={handleVerify} text={loc.addresses.sign_verify} disabled={loading} />
          </FContainer>
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
  );
};

export default SignVerify;

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  textMessage: {
    minHeight: 50,
  },
  flex: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
