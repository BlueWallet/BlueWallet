import React, { createContext, useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

type SplitLayoutValue = {
  isExpanded: boolean;
  column: 'primary' | 'secondary';
};

const SplitLayoutContext = createContext<SplitLayoutValue | undefined>(undefined);

export const SplitLayoutProvider = ({ children, isExpanded, column }: React.PropsWithChildren<SplitLayoutValue>) => {
  const value = useMemo(() => ({ isExpanded, column }), [column, isExpanded]);
  return <SplitLayoutContext.Provider value={value}>{children}</SplitLayoutContext.Provider>;
};

export const useSplitLayout = (): SplitLayoutValue => {
  const context = useContext(SplitLayoutContext);
  const { width } = useWindowDimensions();

  // Components outside the wallet split (for example modal stacks) still need
  // sensible responsive layout without depending on UIKit size classes.
  return context ?? { isExpanded: width >= 768, column: 'secondary' };
};
