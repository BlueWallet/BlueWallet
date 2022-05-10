import React, { useContext, useMemo } from 'react';

type CellContextValue = {
  isActive: boolean;
};

const CellContext = React.createContext<CellContextValue | undefined>(undefined);

type Props = {
  isActive: boolean;
  children: React.ReactNode;
};

export default function CellProvider({ isActive, children }: Props) {
  const value = useMemo(
    () => ({
      isActive,
    }),
    [isActive],
  );
  return <CellContext.Provider value={value}>{children}</CellContext.Provider>;
}

export function useIsActive() {
  const value = useContext(CellContext);
  if (!value) {
    throw new Error('useIsActive must be called from within CellProvider!');
  }
  return value.isActive;
}
