import { forwardRef } from 'react';

const BaseToolTipMenu = props => {
  return props.children;
};

const ToolTipMenu = forwardRef(BaseToolTipMenu);

export default ToolTipMenu;
