import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Interface defining the settings for the useAppState hook.
 *
 * @param onChange Optional callback function triggered on app state change.
 * @param onForeground Optional callback function triggered when the app enters the foreground.
 * @param onBackground Optional callback function triggered when the app enters the background.
 */
interface AppStateSettings {
  onChange?: (newState: AppStateStatus) => void;
  onForeground?: () => void;
  onBackground?: () => void;
}

/**
 * Validates if the provided argument is a function.
 *
 * @param func The argument to validate.
 * @returns True if the argument is a function, false otherwise.
 */
function isValidFunction<T extends (...args: any[]) => any>(func?: T): func is T {
  return typeof func === 'function';
}

/**
 * A custom React hook that listens to changes in the app's state.
 *
 * This hook provides an easy way to perform actions when the app transitions
 * between states (active, background, and inactive).
 *
 * @param settings An object containing callback functions for different app state changes.
 * @returns An object containing the current app state.
 */
export default function useAppState(settings?: AppStateSettings) {
  const { onChange, onForeground, onBackground } = settings || {};
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    function handleAppStateChange(nextAppState: AppStateStatus) {
      if (nextAppState === 'active' && appState !== 'active') {
        isValidFunction(onForeground) && onForeground();
      } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        isValidFunction(onBackground) && onBackground();
      }
      setAppState(nextAppState);
      isValidFunction(onChange) && onChange(nextAppState);
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup the event listener when the component unmounts or dependencies change
    return () => subscription.remove();
  }, [onChange, onForeground, onBackground, appState]);

  return { appState };
}
