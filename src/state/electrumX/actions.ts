export enum ElectrumXAction {
  StartListeners = 'StartListeners',
  SetBlockHeight = 'SetBlockHeight',
  ScriptHashChanged = 'ScriptHashChanged',
  SetSubscribedScriptHashes = 'SetSubscribedScriptHashes',
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
  | SetSubscribedScriptHashesAction;

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
