import React, { useContext } from 'react';
import { DraggableFlatListProps } from '../types';

const PropsContext = React.createContext<DraggableFlatListProps<any> | undefined>(undefined);

type Props<T> = DraggableFlatListProps<T> & { children: React.ReactNode };

export default function PropsProvider<T>({ children, ...props }: Props<T>) {
  return <PropsContext.Provider value={props}>{children}</PropsContext.Provider>;
}

export function useProps<T>() {
  const value = useContext(PropsContext) as DraggableFlatListProps<T> | undefined;
  if (!value) {
    throw new Error('useProps must be called from within PropsProvider!');
  }
  return value;
}
