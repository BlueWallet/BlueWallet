import { forwardRef, Ref } from 'react';
import { ToolTipMenuProps } from './types';

const BaseToolTipMenu = (props: ToolTipMenuProps, _ref: Ref<any>) => {
  return props.children;
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
