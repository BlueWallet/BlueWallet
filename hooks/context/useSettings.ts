import { useContext } from 'react';
import { SettingsContext } from '../../components/Context/SettingsContext';

export const useSettings = () => useContext(SettingsContext);
