import React, { ReactNode } from 'react';
import { Platform, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import ToolTipMenu from './TooltipMenu';
import loc from '../loc';
const fs = require('../blue_modules/fs');

interface SaveFileButtonProps {
  fileName: string;
  fileContent: string;
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const SaveFileButton: React.FC<SaveFileButtonProps> = ({ fileName, fileContent, children, onPress, style }) => {
  const actions = [
    { id: 'save', text: loc._.save_to_downloads },
    { id: 'share', text: loc.receive.details_share },
  ];

  const handlePressMenuItem = (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (action?.id === 'save') {
      fs.writeFileAndExport(fileName, fileContent, false);
    } else if (action?.id === 'share') {
      fs.writeFileAndExport(fileName, fileContent, true);
    }
  };

  return Platform.OS === 'android' ? (
    <ToolTipMenu isMenuPrimaryAction actions={actions} onPressMenuItem={handlePressMenuItem} buttonStyle={style}>
      {children}
    </ToolTipMenu>
  ) : (
    <TouchableOpacity onPress={onPress} style={style}>
      {children}
    </TouchableOpacity>
  );
};

export default SaveFileButton;
