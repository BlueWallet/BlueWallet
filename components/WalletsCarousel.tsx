import React, { useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, FlatListProps, ListRenderItemInfo } from 'react-native';
import { TWallet } from '../class/wallets/types';
import WalletView from './WalletView';

interface WalletsCarouselProps extends Partial<FlatListProps<any>> {
  horizontal?: boolean;
  selectedWallet?: string;
  onPress: (item?: TWallet) => void;
  onNewWalletPress?: () => void;
  handleLongPress?: () => void;
  data: TWallet[];
  scrollEnabled?: boolean;
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
}

type FlatListRefType = FlatList<any> & {
  scrollToEnd(params?: { animated?: boolean | null }): void;
  scrollToIndex(params: { animated?: boolean | null; index: number; viewOffset?: number; viewPosition?: number }): void;
  scrollToItem(params: { animated?: boolean | null; item: TWallet; viewPosition?: number }): void;
  scrollToOffset(params: { animated?: boolean | null; offset: number }): void;
  recordInteraction(): void;
  flashScrollIndicators(): void;
  getNativeScrollRef(): View;
};

const WalletsCarousel = forwardRef<FlatListRefType, WalletsCarouselProps>((props, ref) => {
  const {
    horizontal,
    data,
    handleLongPress,
    onPress,
    selectedWallet,
    scrollEnabled,
    onNewWalletPress,
    searchQuery,
    renderHighlightedText,
  } = props;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TWallet>) =>
      item ? (
        <WalletView
          type="Carousel"
          wallet={item}
          isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
          handleLongPress={handleLongPress}
          onPress={onPress}
          horizontal={horizontal}
          searchQuery={searchQuery}
          renderHighlightedText={renderHighlightedText}
        />
      ) : null,
    [horizontal, selectedWallet, handleLongPress, onPress, searchQuery, renderHighlightedText],
  );

  const flatListRef = useRef<FlatList<any>>(null);

  useImperativeHandle(
    ref,
    (): any => {
      return {
        scrollToEnd: (params: { animated?: boolean | null | undefined } | undefined) => flatListRef.current?.scrollToEnd(params),
        scrollToIndex: (params: {
          animated?: boolean | null | undefined;
          index: number;
          viewOffset?: number | undefined;
          viewPosition?: number | undefined;
        }) => flatListRef.current?.scrollToIndex(params),
        scrollToItem: (params: {
          animated?: boolean | null | undefined;
          item: any;
          viewOffset?: number | undefined;
          viewPosition?: number | undefined;
        }) => flatListRef.current?.scrollToItem(params),
        scrollToOffset: (params: { animated?: boolean | null | undefined; offset: number }) => flatListRef.current?.scrollToOffset(params),
        recordInteraction: () => flatListRef.current?.recordInteraction(),
        flashScrollIndicators: () => flatListRef.current?.flashScrollIndicators(),
        getNativeScrollRef: () => flatListRef.current?.getNativeScrollRef(),
      };
    },
    [],
  );

  const onScrollToIndexFailed = (error: { averageItemLength: number; index: number }): void => {
    console.debug('onScrollToIndexFailed');
    console.debug(error);
    flatListRef.current?.scrollToOffset({ offset: error.averageItemLength * error.index, animated: true });
    setTimeout(() => {
      if (data.length !== 0 && flatListRef.current !== null) {
        flatListRef.current.scrollToIndex({ index: error.index, animated: true });
      }
    }, 100);
  };

  const { width } = useWindowDimensions();
  const sliderHeight = 195;
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;

  return horizontal ? (
    <FlatList
      ref={flatListRef}
      renderItem={renderItem}
      extraData={data}
      keyExtractor={(_, index) => index.toString()}
      showsVerticalScrollIndicator={false}
      pagingEnabled
      disableIntervalMomentum={horizontal}
      snapToInterval={itemWidth}
      decelerationRate="fast"
      contentContainerStyle={styles.content}
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      initialNumToRender={10}
      scrollEnabled={scrollEnabled}
      ListHeaderComponent={ListHeaderComponent}
      style={{ minHeight: sliderHeight + 12 }}
      onScrollToIndexFailed={onScrollToIndexFailed}
      ListFooterComponent={onNewWalletPress ? <WalletView type="Add" onPress={onNewWalletPress} /> : null}
      {...props}
    />
  ) : (
    <View style={styles.contentLargeScreen}>
      {data.map((item, index) =>
        item ? (
          <WalletView
            type="Carousel"
            wallet={item}
            isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
            handleLongPress={handleLongPress}
            onPress={onPress}
            key={index}
            searchQuery={props.searchQuery}
            renderHighlightedText={props.renderHighlightedText}
          />
        ) : null,
      )}
      {onNewWalletPress && <WalletView type="Add" onPress={onNewWalletPress} />}
    </View>
  );
});

const ListHeaderComponent = () => <View style={styles.separatorStyle} />;

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
  },
  contentLargeScreen: {
    paddingHorizontal: 16,
  },
  separatorStyle: {
    width: 16,
    height: 20,
  },
});

export default WalletsCarousel;
