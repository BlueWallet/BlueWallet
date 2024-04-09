import React, { ReactNode } from 'react';

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  return <>{children}</>;
};
