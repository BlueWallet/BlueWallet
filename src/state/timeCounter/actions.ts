export enum TimeCounterAction {
  SetTimeCounter = 'SetTimeCounter',
  SetFailedAttempts = 'SetFailedAttempts',
  SetFailedAttemptStep = 'SetFailedAttemptStep',
}

export interface SetTimeCounterAction {
  type: TimeCounterAction.SetTimeCounter;
  timestamp: number;
}

export interface SetFailedAttemptsAction {
  type: TimeCounterAction.SetFailedAttempts;
  attempt: number;
}

export interface SetFailedAttemptStepAction {
  type: TimeCounterAction.SetFailedAttemptStep;
  failedAttemptStep: number;
}

export type TimeCounterActionType = SetTimeCounterAction | SetFailedAttemptsAction | SetFailedAttemptStepAction;

export const setTimeCounter = (timestamp: number): SetTimeCounterAction => ({
  type: TimeCounterAction.SetTimeCounter,
  timestamp,
});

export const setFailedAttempts = (attempt: number): SetFailedAttemptsAction => ({
  type: TimeCounterAction.SetFailedAttempts,
  attempt,
});

export const setFailedAttemptStep = (failedAttemptStep: number): SetFailedAttemptStepAction => ({
  type: TimeCounterAction.SetFailedAttemptStep,
  failedAttemptStep,
});
