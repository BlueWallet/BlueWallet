import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { images } from 'app/assets';
import { typography, palette } from 'app/styles';

import { Avatar } from './Avatar';
import { EllipsisText } from './EllipsisText';
import { GradientVariant } from './GradientView';
import { Image } from './Image';

const i18n = require('../../loc');

export interface WalletItemProps {
  name: string;
  value: number;
  title: string;
  index: number;
  onPress: (index: number) => void;
  variant?: GradientVariant;
  selected?: boolean;
  unit?: string;
}

export const WalletItem = (props: WalletItemProps) => {
  const { name, value, title, selected, index, onPress, variant, unit } = props;
  const onWalletPress = () => onPress(index);

  return (
    <TouchableOpacity style={styles.container} onPress={onWalletPress}>
      <View>
        <Avatar variant={variant} title={title} />
        {selected && <Image style={styles.image} source={images.successBadge} />}
      </View>
      <View style={styles.textContainer}>
        <Text style={typography.headline5}>{i18n.formatBalance(Number(value), unit, true)}</Text>
        <EllipsisText style={styles.name}>{name}</EllipsisText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  textContainer: {
    flexDirection: 'column',
    marginLeft: 26,
  },
  name: {
    marginRight: 80,
    ...typography.caption,
    color: palette.textGrey,
  },
  image: {
    width: 41,
    height: 41,
    position: 'absolute',
    left: 8,
    top: -12,
  },
});
