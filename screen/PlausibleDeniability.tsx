import React, { useCallback, useEffect, useReducer } from 'react';
import { StackActions, RouteProp, useRoute } from '@react-navigation/native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { BlueCard, BlueText } from '../BlueComponents';
import presentAlert from '../components/Alert';
import Button from '../components/Button';
import loc from '../loc';
import { useStorage } from '../hooks/context/useStorage';
import { MODAL_TYPES } from './PromptPasswordConfirmationSheet.types';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import SafeAreaScrollView from '../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../components/BlueSpacing';
import { BlueLoading } from '../components/BlueLoading';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';

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
  const navigation = useExtendedNavigation();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'PlausibleDeniability'>>();

  const handleOnCreateFakeStorageButtonPressed = async () => {
    dispatch({ type: SET_LOADING, payload: true });
    dispatch({ type: SET_MODAL_TYPE, payload: MODAL_TYPES.CREATE_FAKE_STORAGE });
    navigation.navigate('PromptPasswordConfirmationSheet', {
      modalType: MODAL_TYPES.CREATE_FAKE_STORAGE,
      returnTo: 'PlausibleDeniability',
    });
  };

  const handleConfirmationSuccess = useCallback(
    async (password: string, modalType: keyof typeof MODAL_TYPES) => {
      let success = false;
      const isProvidedPasswordInUse = password === cachedPassword || (await isPasswordInUse(password));
      if (isProvidedPasswordInUse) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.plausibledeniability.password_should_not_match });
        return false;
      }

      if (modalType === MODAL_TYPES.CREATE_FAKE_STORAGE) {
        try {
          await createFakeStorage(password);
          resetWallets();
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          dispatch({ type: SET_MODAL_TYPE, payload: MODAL_TYPES.SUCCESS });
          success = true;
          setTimeout(async () => {
            const popToTop = StackActions.popToTop();
            navigation.dispatch(popToTop);
          }, 3000);
        } catch {
          success = false;
          dispatch({ type: SET_LOADING, payload: false });
        }
      }

      return success;
    },
    [cachedPassword, createFakeStorage, isPasswordInUse, navigation, resetWallets],
  );

  const handleConfirmationFailure = useCallback(() => {
    dispatch({ type: SET_LOADING, payload: false });
  }, []);

  useEffect(() => {
    const sheetResult = route.params?.passwordSheetResult;
    if (!sheetResult) return;

    navigation.setParams({ passwordSheetResult: undefined });

    if (sheetResult.status !== 'success' || !sheetResult.password) {
      handleConfirmationFailure();
      return;
    }

    handleConfirmationSuccess(sheetResult.password, sheetResult.modalType).finally(() => {
      dispatch({ type: SET_LOADING, payload: false });
    });
  }, [handleConfirmationFailure, handleConfirmationSuccess, navigation, route.params?.passwordSheetResult]);

  return (
    <SafeAreaScrollView centerContent={state.isLoading}>
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
    </SafeAreaScrollView>
  );
};

export default PlausibleDeniability;
