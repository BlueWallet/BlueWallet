import React, { Component } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Carousel from 'react-native-snap-carousel';

import { WalletCard } from 'app/components';
import { Wallet } from 'app/consts';

interface Props {
  data: Wallet[];
  keyExtractor: (item: Wallet, index: number) => string;
  getIndex: (index: number) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export class WalletsCarousel extends Component<Props> {
  carouselRef = React.createRef<any>();

  renderItem = ({ item }: { item: Wallet }) => {
    return (
      <View style={styles.walletCard}>
        <WalletCard wallet={item} showEditButton />
      </View>
    );
  };

  snap = (index: number) => {
    this.carouselRef.current!.snapToItem(index, true);
  };

  render() {
    const { getIndex } = this.props;
    return (
      <View>
        <Carousel
          {...this.props}
          ref={this.carouselRef}
          renderItem={this.renderItem}
          sliderWidth={SCREEN_WIDTH}
          itemWidth={SCREEN_WIDTH * 0.82}
          onSnapToItem={index => getIndex(index)}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  walletCard: { alignItems: 'center' },
});
