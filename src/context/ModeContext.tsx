import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ModeType = 'simple' | 'pro';

interface ModeContextType {
  mode: ModeType;
  toggleMode: () => void;
  isSimple: boolean;
  isPro: boolean;
}

export const ModeContext = createContext<ModeContextType | undefined>(undefined);

interface ModeProviderProps {
  children: ReactNode;
}

export const ModeProvider: React.FC<ModeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ModeType>('pro'); // Por defecto Pro

  useEffect(() => {
    const loadMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('@app_mode');
        if (savedMode === 'simple' || savedMode === 'pro') {
          setMode(savedMode as ModeType);
        }
      } catch (e) {
        console.log('Error cargando modo:', e);
      }
    };
    loadMode();
  }, []);

  const toggleMode = async () => {
    const newMode = mode === 'pro' ? 'simple' : 'pro';
    setMode(newMode);
    try {
      await AsyncStorage.setItem('@app_mode', newMode);
    } catch (e) {
      console.log('Error guardando modo:', e);
    }
  };

  return (
    <ModeContext.Provider value={{ mode, toggleMode, isSimple: mode === 'simple', isPro: mode === 'pro' }}>
      {children}
    </ModeContext.Provider>
  );
};