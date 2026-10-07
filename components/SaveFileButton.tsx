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
  textFileName?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  afterOnPress?: () => void;
  beforeOnPress?: (() => Promise<void>) | (() => void);
}

const SaveFileButton: React.FC<SaveFileButtonProps> = ({
  fileName,
  fileContent,
  textFileName,
  children,
  style,
  beforeOnPress,
  afterOnPress,
}) => {
  const handlePressMenuItem = useCallback(
    async (actionId: string) => {
      if (beforeOnPress) {
        await beforeOnPress();
      }
      if (textFileName && (actionId === 'saveTxt' || actionId === 'shareTxt')) {
        await fs.writeFileAndExport(textFileName, fileContent, actionId === 'shareTxt').finally(() => afterOnPress?.());
        return;
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
    [afterOnPress, beforeOnPress, fileContent, fileName, textFileName],
  );

  return (
    <ToolTipMenu
      isButton
      shouldOpenOnLongPress={false}
      actions={
        textFileName
          ? [
              ...actions,
              {
                id: 'saveTxt',
                text: `${loc._.save} (.txt)`,
                icon: actionIcons.Save,
              },
              {
                id: 'shareTxt',
                text: `${loc.receive.details_share} (.txt)`,
                icon: actionIcons.Share,
              },
            ]
          : actions
      }
      onPressMenuItem={handlePressMenuItem}
      buttonStyle={style as ViewStyle}
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
