import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { images } from 'app/assets';
import { typography, palette } from 'app/styles';

import { Avatar } from './Avatar';
import { GradientVariant } from './GradientView';
import { Image } from './Image';

const i18n = require('../../loc');

export interface WalletItemProps {
  name: string;
  value: number;
  title: string;
  key: number;
  onPress: (key: number) => void;
  variant?: GradientVariant;
  selected?: boolean;
  unit?: string;
}

export const WalletItem = (props: WalletItemProps) => {
  const { name, value, title, selected, onPress, key, variant, unit } = props;
  const onWalletPress = () => onPress(key);

  return (
    <TouchableOpacity key={key} style={styles.container} onPress={onWalletPress}>
      <View>
        <Avatar variant={variant} title={title} />
        {selected && <Image style={styles.image} source={images.successBadge} />}
      </View>
      <View style={styles.textContainer}>
        <Text style={typography.headline5}>{i18n.formatBalance(Number(value), unit, true)}</Text>
        <Text style={styles.name}>{name}</Text>
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
