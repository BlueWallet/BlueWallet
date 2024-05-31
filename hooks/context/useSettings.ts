import { useContext } from 'react';
import { SettingsContext } from '../../components/Context/SettingsProvider';

export const useSettings = () => useContext(SettingsContext);
