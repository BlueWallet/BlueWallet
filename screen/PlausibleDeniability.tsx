import React, { useCallback, useReducer } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { BlueCard, BlueText } from '../BlueComponents';
import Button from '../components/Button';
import loc from '../loc';
import { MODAL_TYPES } from './PromptPasswordConfirmationSheet.types';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import SafeAreaScrollView from '../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../components/BlueSpacing';
import { BlueLoading } from '../components/BlueLoading';
import { useStorage } from '../hooks/context/useStorage';

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
  useStorage();
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigation = useExtendedNavigation();

  const handleOnCreateFakeStorageButtonPressed = async () => {
    dispatch({ type: SET_LOADING, payload: true });
    dispatch({ type: SET_MODAL_TYPE, payload: MODAL_TYPES.CREATE_FAKE_STORAGE });
    navigation.navigate('PromptPasswordConfirmationSheet', {
      modalType: MODAL_TYPES.CREATE_FAKE_STORAGE,
      returnTo: 'PlausibleDeniability',
    });
  };

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: SET_LOADING, payload: false });
      dispatch({ type: SET_MODAL_TYPE, payload: MODAL_TYPES.CREATE_FAKE_STORAGE });
    }, []),
  );

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
