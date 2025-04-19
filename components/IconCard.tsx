import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePlatformTheme } from '../theme';
import { useTheme } from './themes';
import { VectorIcon } from './icons/VectorIcons';

interface IconCardProps {
  iconName: string;
  iconType: string;
  iconKey: string;
  backgroundColor?: string;
  customColor?: string;
}

/**
 * A reusable icon component that displays icons with proper styling
 * based on the platform theme and current appearance mode.
 */
const IconCard: React.FC<IconCardProps> = ({ iconName, iconType, iconKey, backgroundColor, customColor }) => {
  const { colors: platformColors, sizing, layout, getIconColors } = usePlatformTheme();
  const { dark: isDarkMode } = useTheme();
  const iconColors = getIconColors(isDarkMode);

  // Determine the icon color - either use custom color or get from standard colors
  const iconColor = customColor || (iconKey && iconColors[iconKey]) || platformColors.titleColor;

  // Determine the background color - either use custom bg or standard bg from platform
  const bgColor =
    backgroundColor ||
    (iconKey === 'github' ? (isDarkMode ? platformColors.grayIconBg : 'rgba(24, 23, 23, 0.1)') : platformColors.blueIconBg);

  const styles = StyleSheet.create({
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: sizing.iconContainerSize,
      height: sizing.iconContainerSize,
      borderRadius: sizing.iconContainerBorderRadius,
      backgroundColor: layout.showIconBackground ? bgColor : 'transparent',
      marginRight: 12,
    },
  });

  return (
    <View style={styles.iconContainer}>
      <VectorIcon
        name={iconName}
        type={iconType}
        size={sizing.iconInnerSize}
        color={String(iconColor)}
      />
    </View>
  );
};

export default IconCard;
