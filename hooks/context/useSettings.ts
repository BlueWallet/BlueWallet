import { useContext } from 'react';
import { SettingsContext } from '../../components/Context/SettingsPriver';

export const useSettings = () => useContext(SettingsContext);
