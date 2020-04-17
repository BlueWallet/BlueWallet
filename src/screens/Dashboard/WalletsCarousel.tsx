import React, { Component } from 'react';
import { View, Dimensions, Text, StyleSheet, ScrollViewProps, TouchableOpacity } from 'react-native';
import Carousel, { CarouselStatic } from 'react-native-snap-carousel';

import { images } from 'app/assets';
import { Image, GradientView, StyledText } from 'app/components';
import { Wallet } from 'app/consts';
import { en } from 'app/locale';
import { typography, palette } from 'app/styles';

const loc = require('./../../../loc/');

interface Props {
  data: any;
  keyExtractor: string;
  onSnapToItem: (index: number) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.82;
const ITEM_HEIGHT = ITEM_WIDTH * 0.63;
export class WalletsCarousel extends Component<Props> {
  carouselRef = React.createRef() as any;

  renderItem({ item }: { item: Wallet }) {
    return (
      <GradientView style={styles.itemContainer} variant={GradientView.Variant.Primary}>
        <>
          <Image source={images.coinLogoInCircle} style={styles.iconInCircle} resizeMode="contain" />
          <View style={styles.cardContent}>
            <View style={styles.row}>
              <Text style={styles.walletType}>{item.getLabel()}</Text>
              <StyledText title="Edit" onPress={() => {}} />
            </View>

            <Text style={styles.balance}>
              {loc.formatBalance(Number(item.balance), item.preferredBalanceUnit, true)}
            </Text>
            <View>
              <Text style={styles.latestTransactionTitle}>{en.wallet.latest}</Text>
              <Text style={styles.latestTransaction}>
                {loc.transactionTimeToReadable(item.getLatestTransactionTime())}
              </Text>
            </View>
          </View>
        </>
      </GradientView>
    );
  }

  snap = (index: number) => {
    this.carouselRef.current!.snapToItem(index, true);
  };

  render() {
    return (
      <View>
        <Carousel
          {...this.props}
          ref={this.carouselRef as any}
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

const styles = StyleSheet.create({
  itemContainer: {
    height: ITEM_HEIGHT,
    borderRadius: 10,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletType: {
    ...typography.headline7,
    color: palette.white,
    maxWidth: ITEM_WIDTH - 60,
  },
  balance: {
    ...typography.headline3,
    color: palette.white,
  },
  latestTransactionTitle: {
    ...typography.subtitle3,
    color: palette.white,
  },
  latestTransaction: {
    ...typography.headline5,
    color: palette.white,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconInCircle: {
    height: 50,
    width: 50,
    position: 'absolute',
    bottom: 10,
    right: 20,
  },
});
