import { ElectrumXAction, ElectrymXActionType } from './actions';

export interface ElectrumXState {
  blockHeight: number;
  subscribedScriptHashes: string[];
}

const initialState: ElectrumXState = {
  blockHeight: 0,
  subscribedScriptHashes: [],
};

export const electrumXReducer = (state = initialState, action: ElectrymXActionType): ElectrumXState => {
  switch (action.type) {
    case ElectrumXAction.SetBlockHeight:
      return {
        ...state,
        blockHeight: action.blockHeight,
      };
    case ElectrumXAction.SetSubscribedScriptHashes:
      return {
        ...state,
        subscribedScriptHashes: action.scriptHashes,
      };
    default:
      return state;
  }
};
