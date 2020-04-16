import React from 'react';
import { GradientVariant } from './GradientView';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Avatar } from './Avatar';
import { typography, palette } from 'styles';
import { en } from 'locale';
import { Image } from './Image';
import { images } from 'assets';

export interface WalletItemProps {
  name: string;
  value: string;
  title: string;
  key: number;
  onPress: (key: number) => void;
  variant?: GradientVariant;
  selected?: boolean;
}

export const WalletItem = (props: WalletItemProps) => {
  const { name, value, title, variant, selected, onPress, key } = props;
  const onWalletPress = () => onPress(key);

  return (
    <TouchableOpacity key={key} style={styles.container} onPress={onWalletPress}>
      <View>
        <Avatar variant={variant} title={title} />
        {selected && <Image style={styles.image} source={images.successBadge} />}
      </View>
      <View style={styles.textContainer}>
        <Text style={typography.headline5}>
          {value} {en.walletModal.btcv}
        </Text>
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
