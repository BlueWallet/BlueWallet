declare module 'react-native-draggable-flatlist' {
  import { FlatListProps, ListRenderItemInfo, StyleProp, ViewStyle } from 'react-native';
  import * as React from 'react';

  export interface DragEndParams<T> {
    data: T[];
    from: number;
    to: number;
  }

  export interface RenderItemParams<T> extends ListRenderItemInfo<T> {
    drag: () => void;
    isActive: boolean;
  }

  export interface DraggableFlatListProps<T> extends FlatListProps<T> {
    renderItem: (params: RenderItemParams<T>) => React.ReactElement | null;
    onDragEnd: (params: DragEndParams<T>) => void;
    onDragBegin?: (index: number) => void;
    activationDistance?: number;
    autoscrollThreshold?: number;
    autoscrollSpeed?: number;
    dragItemOverflow?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
    animationConfig?: Record<string, unknown>;
  }

  export default class DraggableFlatList<T> extends React.Component<DraggableFlatListProps<T>> {}
}
