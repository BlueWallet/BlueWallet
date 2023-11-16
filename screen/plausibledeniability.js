import React, { useContext, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import navigationStyle from '../components/navigationStyle';
import { BlueLoading, SafeBlueArea, BlueCard, BlueText, BlueSpacing20 } from '../BlueComponents';
import loc from '../loc';
import { BlueStorageContext } from '../blue_modules/storage-context';
import alert from '../components/Alert';
import Button from '../components/Button';
const prompt = require('../helpers/prompt');

const PlausibleDeniability = () => {
  const { cachedPassword, isPasswordInUse, createFakeStorage, resetWallets } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(false);
  const { popToTop } = useNavigation();

  const handleOnCreateFakeStorageButtonPressed = async () => {
    setIsLoading(true);
    try {
      const p1 = await prompt(loc.plausibledeniability.create_password, loc.plausibledeniability.create_password_explanation);
      const isProvidedPasswordInUse = p1 === cachedPassword || (await isPasswordInUse(p1));
      if (isProvidedPasswordInUse) {
        setIsLoading(false);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return alert(loc.plausibledeniability.password_should_not_match);
      }
      if (!p1) {
        setIsLoading(false);
        return;
      }
      const p2 = await prompt(loc.plausibledeniability.retype_password);
      if (p1 !== p2) {
        setIsLoading(false);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return alert(loc.plausibledeniability.passwords_do_not_match);
      }

      await createFakeStorage(p1);
      await resetWallets();
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      alert(loc.plausibledeniability.success);
      popToTop();
    } catch {
      setIsLoading(false);
    }
  };

  return isLoading ? (
    <SafeBlueArea>
      <BlueLoading />
    </SafeBlueArea>
  ) : (
    <SafeBlueArea>
      <BlueCard>
        <ScrollView maxHeight={450}>
          <BlueText>{loc.plausibledeniability.help}</BlueText>

          <BlueText />

          <BlueText>{loc.plausibledeniability.help2}</BlueText>

          <BlueSpacing20 />

          <Button
            testID="CreateFakeStorageButton"
            title={loc.plausibledeniability.create_fake_storage}
            onPress={handleOnCreateFakeStorageButtonPressed}
          />
        </ScrollView>
      </BlueCard>
    </SafeBlueArea>
  );
};

export default PlausibleDeniability;

PlausibleDeniability.navigationOptions = navigationStyle({
  title: loc.plausibledeniability.title,
});
