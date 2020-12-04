import { ElectrumXAction, ElectrymXActionType } from './actions';

export interface ElectrumXState {
  blockHeight: number;
  subscribedScriptHashes: string[];
  isServerConnected: boolean;
  isInternetReachable: boolean;
  hasConnectedToServerAtLeaseOnce: boolean;
  error: string;
}

const initialState: ElectrumXState = {
  blockHeight: 0,
  subscribedScriptHashes: [],
  isServerConnected: false,
  isInternetReachable: false,
  hasConnectedToServerAtLeaseOnce: false,
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
    case ElectrumXAction.ConnectionClosed:
      return {
        ...state,
        subscribedScriptHashes: [],
        isServerConnected: false,
      };
    case ElectrumXAction.ConnectionConnected:
      return {
        ...state,
        isServerConnected: true,
        hasConnectedToServerAtLeaseOnce: true,
      };
    case ElectrumXAction.FetchBlockHeightFailure:
      return {
        ...state,
        error: action.error,
      };
    case ElectrumXAction.SetInternetConnection:
      return {
        ...state,
        isInternetReachable: action.isInternetReachable,
      };
    case ElectrumXAction.SetServerConnection:
      return {
        ...state,
        isServerConnected: action.isServerConnected,
        hasConnectedToServerAtLeaseOnce: state.hasConnectedToServerAtLeaseOnce || action.isServerConnected,
      };
    default:
      return state;
  }
};
