import React, { ReactNode } from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import ToolTipMenu from './TooltipMenu';
import loc from '../loc';
import { ActionIcons } from '../typings/ActionIcons';
const fs = require('../blue_modules/fs');

interface SaveFileButtonProps {
  fileName: string;
  fileContent: string | (() => string);
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  afterOnPress?: () => void;
  beforeOnPress?: () => Promise<void>; // Changed this line
}

const SaveFileButton: React.FC<SaveFileButtonProps> = ({ fileName, fileContent, children, style, beforeOnPress, afterOnPress }) => {
  const actions = [
    { id: 'save', text: loc._.save, icon: actionIcons.Save },
    { id: 'share', text: loc.receive.details_share, icon: actionIcons.Share },
  ];

  const handlePressMenuItem = async (actionId: string) => {
    if (beforeOnPress) {
      await beforeOnPress(); // Now properly awaiting a function that returns a promise
    }
    const action = actions.find(a => a.id === actionId);
    const content = typeof fileContent === 'function' ? fileContent() : fileContent; // Simplified this line

    if (action?.id === 'save') {
      await fs.writeFileAndExport(fileName, content, false, Platform.OS !== 'android').finally(() => {
        afterOnPress?.(); // Safely call afterOnPress if it exists
      });
    } else if (action?.id === 'share') {
      await fs.writeFileAndExport(fileName, content, true).finally(() => {
        afterOnPress?.(); // Safely call afterOnPress if it exists
      });
    }
  };

  return (
    <ToolTipMenu isButton isMenuPrimaryAction actions={actions} onPressMenuItem={handlePressMenuItem} buttonStyle={style}>
      {children}
    </ToolTipMenu>
  );
};

export default SaveFileButton;

const actionIcons: { [key: string]: ActionIcons } = {
  Share: {
    iconType: 'SYSTEM',
    iconValue: 'square.and.arrow.up',
  },
  Save: {
    iconType: 'SYSTEM',
    iconValue: 'square.and.arrow.down',
  },
};
