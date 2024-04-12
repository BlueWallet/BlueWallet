import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import ToolTipMenu from './TooltipMenu';
import loc from '../loc';
import { ActionIcons } from '../typings/ActionIcons';
const fs = require('../blue_modules/fs');

interface SaveFileButtonProps {
  fileName: string;
  fileContent: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  afterOnPress?: () => void;
  beforeOnPress?: () => Promise<void>; // Changed this line
  onMenuWillHide?: () => void;
  onMenuWillShow?: () => void;
}

const SaveFileButton: React.FC<SaveFileButtonProps> = ({
  fileName,
  fileContent,
  children,
  style,
  beforeOnPress,
  afterOnPress,
  onMenuWillHide,
  onMenuWillShow,
}) => {
  const actions = [
    { id: 'save', text: loc._.save, icon: actionIcons.Save },
    { id: 'share', text: loc.receive.details_share, icon: actionIcons.Share },
  ];

  const handlePressMenuItem = async (actionId: string) => {
    if (beforeOnPress) {
      await beforeOnPress(); // Now properly awaiting a function that returns a promise
    }
    const action = actions.find(a => a.id === actionId);

    if (action?.id === 'save') {
      await fs.writeFileAndExport(fileName, fileContent, false).finally(() => {
        afterOnPress?.(); // Safely call afterOnPress if it exists
      });
    } else if (action?.id === 'share') {
      await fs.writeFileAndExport(fileName, fileContent, true).finally(() => {
        afterOnPress?.(); // Safely call afterOnPress if it exists
      });
    }
  };

  return (
    // @ts-ignore: Tooltip must be refactored to use TSX}
    <ToolTipMenu
      onMenuWillHide={onMenuWillHide}
      onMenuWillShow={onMenuWillShow}
      isButton
      isMenuPrimaryAction
      actions={actions}
      onPressMenuItem={handlePressMenuItem}
      buttonStyle={style}
    >
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
