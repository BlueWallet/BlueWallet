import React, { useContext, useMemo } from 'react';

type Props<T> = {
  activeKey: string | null;
  onDragEnd: ([from, to]: readonly number[]) => void;
  keyExtractor: (item: T, index: number) => string;
  horizontal: boolean;
  children: React.ReactNode;
};

type DraggableFlatListContextValue<T> = Omit<Props<T>, 'children'>;

const DraggableFlatListContext = React.createContext<DraggableFlatListContextValue<any> | undefined>(undefined);

export default function DraggableFlatListProvider<T>({ activeKey, onDragEnd, keyExtractor, horizontal, children }: Props<T>) {
  const value = useMemo(
    () => ({
      activeKey,
      keyExtractor,
      onDragEnd,
      horizontal,
    }),
    [activeKey, onDragEnd, keyExtractor, horizontal],
  );

  return <DraggableFlatListContext.Provider value={value}>{children}</DraggableFlatListContext.Provider>;
}

export function useDraggableFlatListContext<T>() {
  const value = useContext(DraggableFlatListContext);
  if (!value) {
    throw new Error('useDraggableFlatListContext must be called within DraggableFlatListProvider');
  }
  return value as DraggableFlatListContextValue<T>;
}
