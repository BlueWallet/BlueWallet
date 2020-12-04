import { Toast } from 'app/consts';

import { ToastMessageAction, ToastMessageActionType } from './actions';

export interface ToastMessagesState {
  toastMessages: Toast[];
}

const initialState: ToastMessagesState = {
  toastMessages: [],
};

export const toastMessageReducer = (state = initialState, action: ToastMessageActionType): ToastMessagesState => {
  switch (action.type) {
    case ToastMessageAction.AddToastMessage:
      return {
        toastMessages: [...state.toastMessages, action.payload],
      };
    case ToastMessageAction.HideToastMessage:
      return {
        ...state,
        toastMessages: state.toastMessages.filter(t => t.id !== action.payload.id),
      };
    default:
      return state;
  }
};
