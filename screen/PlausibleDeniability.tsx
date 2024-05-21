import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext, useReducer } from 'react';
import { ScrollView } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { BlueCard, BlueLoading, BlueSpacing20, BlueText } from '../BlueComponents';
import presentAlert from '../components/Alert';
import Button from '../components/Button';
import prompt from '../helpers/prompt';
import loc from '../loc';

// Action Types
const SET_LOADING = 'SET_LOADING';

// Defining State and Action Types
type State = {
  isLoading: boolean;
};

type Action = { type: typeof SET_LOADING; payload: boolean };

// Initial State
const initialState: State = {
  isLoading: false,
};

// Reducer Function
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case SET_LOADING:
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Component
const PlausibleDeniability: React.FC = () => {
  const { cachedPassword, isPasswordInUse, createFakeStorage, resetWallets } = useContext(BlueStorageContext);
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();

  const handleOnCreateFakeStorageButtonPressed = async () => {
    dispatch({ type: SET_LOADING, payload: true });
    try {
      const p1 = await prompt(loc.plausibledeniability.create_password, loc.plausibledeniability.create_password_explanation);
      const isProvidedPasswordInUse = p1 === cachedPassword || (await isPasswordInUse(p1));
      if (isProvidedPasswordInUse) {
        dispatch({ type: SET_LOADING, payload: false });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return presentAlert({ message: loc.plausibledeniability.password_should_not_match });
      }
      if (!p1) {
        dispatch({ type: SET_LOADING, payload: false });
        return;
      }
      const p2 = await prompt(loc.plausibledeniability.create_password, loc.plausibledeniability.retype_password);
      if (p1 !== p2) {
        dispatch({ type: SET_LOADING, payload: false });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return presentAlert({ message: loc.plausibledeniability.passwords_do_not_match });
      }

      await createFakeStorage(p1);
      resetWallets();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      presentAlert({ message: loc.plausibledeniability.success });
      navigation.popToTop();
    } catch {
      dispatch({ type: SET_LOADING, payload: false });
    }
  };

  return (
    <ScrollView centerContent={state.isLoading} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      {state.isLoading ? (
        <BlueLoading />
      ) : (
        <BlueCard>
          <BlueText>{loc.plausibledeniability.help}</BlueText>
          <BlueText />
          <BlueText>{loc.plausibledeniability.help2}</BlueText>
          <BlueSpacing20 />
          <Button
            testID="CreateFakeStorageButton"
            title={loc.plausibledeniability.create_fake_storage}
            onPress={handleOnCreateFakeStorageButtonPressed}
          />
        </BlueCard>
      )}
    </ScrollView>
  );
};

export default PlausibleDeniability;
