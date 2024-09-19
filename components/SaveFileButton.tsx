import React, { ReactNode, useCallback } from 'react';
import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

import * as fs from '../blue_modules/fs';
import loc from '../loc';
import { ActionIcons } from '../typings/ActionIcons';
import ToolTipMenu from './TooltipMenu';
import { Action } from './types';

interface SaveFileButtonProps extends TouchableOpacityProps {
  fileName: string;
  fileContent: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  afterOnPress?: () => void;
  beforeOnPress?: () => Promise<void>;
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
  const handlePressMenuItem = useCallback(
    async (actionId: string) => {
      if (beforeOnPress) {
        await beforeOnPress();
      }
      const action = actions.find(a => a.id === actionId);

      if (action?.id === 'save') {
        await fs.writeFileAndExport(fileName, fileContent, false).finally(() => {
          afterOnPress?.();
        });
      } else if (action?.id === 'share') {
        await fs.writeFileAndExport(fileName, fileContent, true).finally(() => {
          afterOnPress?.();
        });
      }
    },
    [afterOnPress, beforeOnPress, fileContent, fileName],
  );

  return (
    <ToolTipMenu
      onMenuWillHide={onMenuWillHide}
      onMenuWillShow={onMenuWillShow}
      isButton
      isMenuPrimaryAction
      actions={actions}
      onPressMenuItem={handlePressMenuItem}
      buttonStyle={style as ViewStyle} // Type assertion to match ViewStyle
      {...{ children }}
    >
      {children}
    </ToolTipMenu>
  );
};

export default SaveFileButton;

const actionIcons: { [key: string]: ActionIcons } = {
  Share: {
    iconValue: 'square.and.arrow.up',
  },
  Save: {
    iconValue: 'square.and.arrow.down',
  },
};
const actions: Action[] = [
  { id: 'save', text: loc._.save, icon: actionIcons.Save },
  { id: 'share', text: loc.receive.details_share, icon: actionIcons.Share },
];
