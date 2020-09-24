import { PureComponent } from 'react';
import { AppState } from 'react-native';

interface Props {
  handleAppComesToForeground?: () => void;
  handleAppComesToBackground?: () => void;
}

interface State {
  appState: string;
}

export default class AppStateManager extends PureComponent<Props, State> {
  state = {
    appState: AppState.currentState,
  };

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  handleAppStateChange = (nextAppState: string) => {
    const { handleAppComesToBackground, handleAppComesToForeground } = this.props;
    const { appState } = this.state;
    if (appState === 'background' && nextAppState === 'active') {
      !!handleAppComesToForeground && handleAppComesToForeground();
    }

    if (nextAppState !== 'active') {
      !!handleAppComesToBackground && handleAppComesToBackground();
    }

    this.setState({ appState: nextAppState });
  };

  render() {
    return null;
  }
}
