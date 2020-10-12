export enum ElectrumXAction {
  StartListeners = 'StartListeners',
  FetchBlockHeight = 'FetchBlockHeight',
  FetchBlockHeightSuccess = 'FetchBlockHeightSuccess',
  FetchBlockHeightFailure = 'FetchBlockHeightFailure',
  SetBlockHeight = 'SetBlockHeight',
  ScriptHashChanged = 'ScriptHashChanged',
  SetSubscribedScriptHashes = 'SetSubscribedScriptHashes',
}

export interface FetchBlockHeightAction {
  type: ElectrumXAction.FetchBlockHeight;
}

export interface FetchBlockHeightSuccessAction {
  type: ElectrumXAction.FetchBlockHeightSuccess;
  blockHeight: number;
}

export interface FetchBlockHeightFailureAction {
  type: ElectrumXAction.FetchBlockHeightFailure;
  error: string;
}
export interface SetBlockHeightAction {
  type: ElectrumXAction.SetBlockHeight;
  blockHeight: number;
}

export interface StartListenersAction {
  type: ElectrumXAction.StartListeners;
}

export interface ScriptHashChangedAction {
  type: ElectrumXAction.ScriptHashChanged;
  scriptHash: string;
}

export interface SetSubscribedScriptHashesAction {
  type: ElectrumXAction.SetSubscribedScriptHashes;
  scriptHashes: string[];
}

export type ElectrymXActionType =
  | SetBlockHeightAction
  | StartListenersAction
  | ScriptHashChangedAction
  | SetSubscribedScriptHashesAction
  | FetchBlockHeightAction
  | FetchBlockHeightSuccessAction
  | FetchBlockHeightFailureAction;

export const startListeners = (): StartListenersAction => ({
  type: ElectrumXAction.StartListeners,
});

export const setBlockHeight = (blockHeight: number): SetBlockHeightAction => ({
  type: ElectrumXAction.SetBlockHeight,
  blockHeight,
});

export const scriptHashChanged = (scriptHash: string): ScriptHashChangedAction => ({
  type: ElectrumXAction.ScriptHashChanged,
  scriptHash,
});

export const setSubscribedScriptHashes = (scriptHashes: string[]): SetSubscribedScriptHashesAction => ({
  type: ElectrumXAction.SetSubscribedScriptHashes,
  scriptHashes,
});

export const fetchBlockHeight = (): FetchBlockHeightAction => ({
  type: ElectrumXAction.FetchBlockHeight,
});

export const fetchBlockHeightSuccess = (blockHeight: number): FetchBlockHeightSuccessAction => ({
  type: ElectrumXAction.FetchBlockHeightSuccess,
  blockHeight,
});

export const fetchBlockHeightFailure = (error: string): FetchBlockHeightFailureAction => ({
  type: ElectrumXAction.FetchBlockHeightFailure,
  error,
});
