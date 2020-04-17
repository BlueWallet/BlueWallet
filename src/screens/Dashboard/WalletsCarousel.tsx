import React, { Component } from 'react';
import { View, Dimensions } from 'react-native';
import Carousel from 'react-native-snap-carousel';

import { WalletCard } from 'app/components';
import { Wallet } from 'app/consts';

interface Props {
  data: any;
  keyExtractor: string;
  onSnapToItem: (index: number) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export class WalletsCarousel extends Component<Props> {
  carouselRef = React.createRef<any>();

  renderItem = ({ item }: { item: Wallet }) => <WalletCard wallet={item} showEditButton />;

  snap = (index: number) => {
    this.carouselRef.current!.snapToItem(index, true);
  };

  render() {
    return (
      <View>
        <Carousel
          {...this.props}
          ref={this.carouselRef}
          renderItem={this.renderItem}
          sliderWidth={SCREEN_WIDTH}
          itemWidth={SCREEN_WIDTH * 0.82}
          onSnapToItem={(index: number) => {
            this.props.onSnapToItem(index);
          }}
        />
      </View>
    );
  }
}
