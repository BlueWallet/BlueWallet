import { TimeCounterAction, TimeCounterActionType } from './actions';

export interface TimeCounterState {
  timestamp: number;
  attempt: number;
  failedAttemptStep: number;
}

const initialState: TimeCounterState = {
  timestamp: 0,
  attempt: 0,
  failedAttemptStep: 0,
};

export const timeCounterReducer = (state = initialState, action: TimeCounterActionType): TimeCounterState => {
  switch (action.type) {
    case TimeCounterAction.SetTimeCounter:
      return {
        ...state,
        timestamp: action.timestamp,
      };
    case TimeCounterAction.SetFailedAttempts:
      return {
        ...state,
        attempt: action.attempt,
      };
    case TimeCounterAction.SetFailedAttemptStep:
      return {
        ...state,
        failedAttemptStep: action.failedAttemptStep,
      };
    default:
      return state;
  }
};
