import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';

type IconType =
  | 'font-awesome'
  | 'font-awesome-5'
  | 'ionicon'
  | 'ionicons'
  | 'material'
  | 'material-community'
  | 'entypo'
  | 'ant-design'
  | 'antdesign'
  | 'feather';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  type?: IconType;
  style?: StyleProp<ViewStyle>;
  solid?: boolean;
  brand?: boolean;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000',
  type = 'font-awesome',
  style,
  solid = false,
  brand = false,
}) => {
  const iconProps = { name, size, color, style };

  switch (type) {
    case 'font-awesome-5':
      return solid ? (
        <FontAwesome5 {...iconProps} solid />
      ) : brand ? (
        <FontAwesome5 {...iconProps} brand />
      ) : (
        <FontAwesome5 {...iconProps} />
      );
    case 'ionicon':
    case 'ionicons':
      return <Ionicons {...iconProps} />;
    case 'material':
      return <MaterialIcons {...iconProps} />;
    case 'material-community':
      return <MaterialCommunityIcons {...iconProps} />;
    case 'entypo':
      return <Entypo {...iconProps} />;
    case 'ant-design':
    case 'antdesign':
      return <AntDesign {...iconProps} />;
    case 'feather':
      return <Feather {...iconProps} />;
    case 'font-awesome':
    default:
      return <FontAwesome {...iconProps} />;
  }
};
