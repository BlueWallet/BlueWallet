import { MODAL_TYPES, ModalType } from './PromptPasswordConfirmationSheet.types';

export const ACTIONS = {
  SET_PASSWORD: 'SET_PASSWORD',
  SET_CONFIRM_PASSWORD: 'SET_CONFIRM_PASSWORD',
  SET_LOADING: 'SET_LOADING',
  HIDE_EXPLANATION: 'HIDE_EXPLANATION',
  RESET: 'RESET',
} as const;

export type State = {
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  showExplanation: boolean;
};

export type Action =
  | { type: typeof ACTIONS.SET_PASSWORD; payload: string }
  | { type: typeof ACTIONS.SET_CONFIRM_PASSWORD; payload: string }
  | { type: typeof ACTIONS.SET_LOADING; payload: boolean }
  | { type: typeof ACTIONS.HIDE_EXPLANATION }
  | { type: typeof ACTIONS.RESET; payload: ModalType };

export const initialState = (modalType: ModalType): State => ({
  password: '',
  confirmPassword: '',
  isLoading: false,
  showExplanation: modalType === MODAL_TYPES.CREATE_PASSWORD,
});

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ACTIONS.SET_PASSWORD:
      return { ...state, password: action.payload };
    case ACTIONS.SET_CONFIRM_PASSWORD:
      return { ...state, confirmPassword: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.HIDE_EXPLANATION:
      return { ...state, showExplanation: false };
    case ACTIONS.RESET:
      return initialState(action.payload);
    default:
      return state;
  }
};
