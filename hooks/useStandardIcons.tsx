import { useTheme } from '../components/themes';
import { usePlatformTheme, IconProps, StandardIconSet } from '../components/platformThemes';

/**
 * A hook that provides standardized icons for the application
 * 
 * @returns A function that returns the icon props for a given icon name
 */
export const useStandardIcons = () => {
  const { dark: isDarkMode } = useTheme();
  const { getStandardIcons } = usePlatformTheme();
  
  const icons = getStandardIcons(isDarkMode);
  
  return <K extends keyof StandardIconSet>(iconName: K): IconProps => {
    return icons[iconName];
  };
};
