import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';

import { images } from 'app/assets';
import { getStatusBarHeight, palette, typography } from 'app/styles';

import { FlatButton } from './FlatButton';
import { GradientView } from './GradientView';
import { Image } from './Image';

interface Props extends Partial<NavigationScreenProps> {
  title: string;
  isBackArrow?: boolean;
  isCancelButton?: boolean;
}

export const Header = ({ title, isBackArrow, isCancelButton, navigation }: Props) => {
  const onLeftItemPress = () => navigation!.pop();
  const renderBackArrow = () => <Image style={styles.image} source={images.backArrow} />;
  const renderCancelButton = () => (
    <FlatButton onPress={onLeftItemPress} titleStyle={typography.headline4} title="Cancel" />
  );
  const renderLeftItem = () => {
    const leftItem = isBackArrow ? renderBackArrow() : isCancelButton ? renderCancelButton() : undefined;

    if (leftItem) {
      return (
        <TouchableOpacity
          style={isBackArrow ? styles.backArrowContainer : styles.cancelButtonContainer}
          onPress={onLeftItemPress}>
          {leftItem}
        </TouchableOpacity>
      );
    }
  };

  return (
    <GradientView variant={GradientView.Variant.Primary} style={styles.container}>
      <>
        {renderLeftItem()}
        <Text style={styles.title}>{title}</Text>
      </>
    </GradientView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: getStatusBarHeight() + 11,
    paddingBottom: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    ...typography.headline4,
    color: palette.white,
  },
  backArrowContainer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
  },
  cancelButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 20,
  },
  image: {
    width: 8,
    height: 13,
  },
});
