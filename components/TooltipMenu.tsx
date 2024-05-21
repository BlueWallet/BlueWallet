import { forwardRef, Ref } from 'react';

import { ToolTipMenuProps } from './types';

const BaseToolTipMenu = (props: ToolTipMenuProps, ref: Ref<any>) => {
  console.debug('ToolTipMenu.tsx ref:', ref);
  return props.children;
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
