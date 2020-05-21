import { PureComponent } from 'react';
import { AppState } from 'react-native';

interface Props {
  handleAppComesToForeground: () => void;
}

interface State {
  appState: string;
}

export class AppStateManager extends PureComponent<Props, State> {
  state = {
    appState: AppState.currentState,
  };

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState: string) => {
    if (this.state.appState.match(/inactive|background/) && nextAppState !== 'active') {
      this.props.handleAppComesToForeground();
    }

    this.setState({ appState: nextAppState });
  };

  render() {
    return null;
  }
}
