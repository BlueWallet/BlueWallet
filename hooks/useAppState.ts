import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const useAppState = (): { currentAppState: AppStateStatus, previousAppState: AppStateStatus | null } => {
  const [currentAppState, setCurrentAppState] = useState<AppStateStatus>(AppState.currentState);
  const previousAppState = useRef<AppStateStatus | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      previousAppState.current = currentAppState;
      setCurrentAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [currentAppState]);

  return { currentAppState, previousAppState: previousAppState.current };
};

export default useAppState;