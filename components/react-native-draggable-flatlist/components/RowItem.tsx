/* eslint-disable react/no-unused-prop-types */
// @ts-ignore: Ignore
import React, { useCallback, useRef } from 'react';
import { useDraggableFlatListContext } from '../context/draggableFlatListContext';
import { useRefs } from '../context/refContext';
import { RenderItem } from '../types';
import { typedMemo } from '../utils';

type Props<T> = {
  extraData?: any;
  drag: (itemKey: string) => void;
  item: T;
  renderItem: RenderItem<T>;
  itemKey: string;
  debug?: boolean;
};

function RowItem<T>(props: Props<T>) {
  const propsRef = useRef(props);
  propsRef.current = props;

  const { activeKey } = useDraggableFlatListContext();
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;
  const { keyToIndexRef } = useRefs();

  const drag = useCallback(() => {
    const { drag, itemKey, debug } = propsRef.current;
    if (activeKeyRef.current) {
      // already dragging an item, noop
      if (debug) console.log('## attempt to drag item while another item is already active, noop');
    }
    drag(itemKey);
  }, []);

  const { renderItem, item, itemKey } = props;
  return (
    <MemoizedInner
      isActive={activeKey === itemKey}
      drag={drag}
      renderItem={renderItem}
      item={item}
      index={keyToIndexRef.current.get(itemKey)}
    />
  );
}

export default typedMemo(RowItem);

type InnerProps<T> = {
  isActive: boolean;
  item: T;
  index?: number;
  drag: () => void;
  renderItem: RenderItem<T>;
};

function Inner<T>({ isActive, item, drag, index, renderItem }: InnerProps<T>) {
  return renderItem({ isActive, item, drag, index }) as JSX.Element;
}
const MemoizedInner = typedMemo(Inner);
