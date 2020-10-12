import { ElectrumXAction, ElectrymXActionType } from './actions';

export interface ElectrumXState {
  blockHeight: number;
  subscribedScriptHashes: string[];
  error: string;
}

const initialState: ElectrumXState = {
  blockHeight: 0,
  subscribedScriptHashes: [],
  error: '',
};

export const electrumXReducer = (state = initialState, action: ElectrymXActionType): ElectrumXState => {
  switch (action.type) {
    case ElectrumXAction.SetBlockHeight:
    case ElectrumXAction.FetchBlockHeightSuccess:
      return {
        ...state,
        blockHeight: action.blockHeight,
      };
    case ElectrumXAction.SetSubscribedScriptHashes:
      return {
        ...state,
        subscribedScriptHashes: action.scriptHashes,
      };
    case ElectrumXAction.FetchBlockHeightFailure:
      return {
        ...state,
        error: action.error,
      };
    default:
      return state;
  }
};
