import React, { useReducer, useRef } from 'react';
import { ScrollView } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueCard, BlueLoading, BlueSpacing20, BlueText } from '../BlueComponents';
import presentAlert from '../components/Alert';
import Button from '../components/Button';
import loc from '../loc';
import { useStorage } from '../hooks/context/useStorage';
import PromptPasswordConfirmationModal, {
  PromptPasswordConfirmationModalHandle,
  MODAL_TYPES,
} from '../components/PromptPasswordConfirmationModal';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';

// Action Types
const SET_LOADING = 'SET_LOADING';
const SET_MODAL_TYPE = 'SET_MODAL_TYPE';

// Defining State and Action Types
type State = {
  isLoading: boolean;
  modalType: keyof typeof MODAL_TYPES;
};

type Action = { type: typeof SET_LOADING; payload: boolean } | { type: typeof SET_MODAL_TYPE; payload: keyof typeof MODAL_TYPES };

// Initial State
const initialState: State = {
  isLoading: false,
  modalType: MODAL_TYPES.CREATE_FAKE_STORAGE,
};

// Reducer Function
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case SET_LOADING:
      return { ...state, isLoading: action.payload };
    case SET_MODAL_TYPE:
      return { ...state, modalType: action.payload };
    default:
      return state;
  }
}

// Component
const PlausibleDeniability: React.FC = () => {
  const { cachedPassword, isPasswordInUse, createFakeStorage, resetWallets } = useStorage();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { navigate } = useExtendedNavigation();
  const promptRef = useRef<PromptPasswordConfirmationModalHandle>(null);

  const handleOnCreateFakeStorageButtonPressed = async () => {
    dispatch({ type: SET_LOADING, payload: true });
    dispatch({ type: SET_MODAL_TYPE, payload: MODAL_TYPES.CREATE_FAKE_STORAGE });
    promptRef.current?.present();
  };

  const handleConfirmationSuccess = async (password: string) => {
    let success = false;
    const isProvidedPasswordInUse = password === cachedPassword || (await isPasswordInUse(password));
    if (isProvidedPasswordInUse) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: loc.plausibledeniability.password_should_not_match });
      return false;
    }

    try {
      await createFakeStorage(password);
      resetWallets();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);

      // Set the modal type to SUCCESS to show the success animation instead of the alert
      dispatch({ type: SET_MODAL_TYPE, payload: MODAL_TYPES.SUCCESS });

      success = true;
      setTimeout(() => {
        navigate('WalletsList');
      }, 3000);
    } catch {
      success = false;
      dispatch({ type: SET_LOADING, payload: false });
    }

    return success;
  };

  const handleConfirmationFailure = () => {
    dispatch({ type: SET_LOADING, payload: false });
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
            disabled={state.isLoading}
          />
        </BlueCard>
      )}
      <PromptPasswordConfirmationModal
        ref={promptRef}
        modalType={state.modalType}
        onConfirmationSuccess={handleConfirmationSuccess}
        onConfirmationFailure={handleConfirmationFailure}
      />
    </ScrollView>
  );
};

export default PlausibleDeniability;
