import React from 'react';
import { ViewStyle } from 'react-native';

// Import vector icon packages
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// FontAwesome6 is imported conditionally if available

// Type definition for icon props
export interface IconProps {
  name: string;
  size: number;
  color: string;
  style?: ViewStyle;
}

/**
 * Renders the appropriate icon based on the provided type.
 * This component handles the mapping from type strings to the appropriate vector icon component.
 */
export const VectorIcon: React.FC<{
  type: string;
  name: string;
  size: number;
  color: string;
  style?: ViewStyle;
}> = ({ type, name, size, color, style }) => {
  // Map icon type to the appropriate component
  switch (type.toLowerCase()) {
    case 'ionicon':
    case 'ionicons':
      return <Ionicons name={name} size={size} color={color} style={style} />;
    case 'font-awesome-5':
      return <FontAwesome5 name={name} size={size} color={color} style={style} />;
    case 'font-awesome-6':
      // Note: FontAwesome6 may not be available in current react-native-vector-icons
      // Fallback to FontAwesome5 if not available
      return <FontAwesome5 name={name} size={size} color={color} style={style} />;
    case 'font-awesome':
      return <FontAwesome name={name} size={size} color={color} style={style} />;
    case 'material-community':
      return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
    case 'material-icons':
    case 'material-design-icons':
      return <MaterialIcons name={name} size={size} color={color} style={style} />;
    default:
      // Default to Ionicons if type is not recognized
      console.warn(`Unknown icon type: ${type}, falling back to Ionicons`);
      return <Ionicons name={name} size={size} color={color} style={style} />;
  }
};

/**
 * A mapping of icon types to their normalized names for consistency
 */
export const ICON_TYPES = {
  IONICONS: 'ionicons',
  FONT_AWESOME5: 'font-awesome-5',
  FONT_AWESOME6: 'font-awesome-6',
  FONT_AWESOME: 'font-awesome',
  MATERIAL_COMMUNITY: 'material-community',
  MATERIAL_DESIGN: 'material-icons',
};