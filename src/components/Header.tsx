import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { GradientView } from './GradientView';
import { getStatusBarHeight, palette, typography } from 'styles';
import { Image } from './Image';
import { images } from 'assets';
import { NavigationScreenProps } from 'react-navigation';
import { FlatButton } from './FlatButton';

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
