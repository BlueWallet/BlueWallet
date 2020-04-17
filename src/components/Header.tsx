import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';

import { images, icons } from 'app/assets';
import { getStatusBarHeight, palette, typography } from 'app/styles';

import { FlatButton } from './FlatButton';
import { GradientView } from './GradientView';
import { Image } from './Image';

const HEADER_HEIGHT = 38;

interface Props extends Partial<NavigationScreenProps> {
  title: string;
  isBackArrow?: boolean;
  isCancelButton?: boolean;
  addFunction?: () => void;
}

export const Header = ({ title, isBackArrow, isCancelButton, navigation, addFunction }: Props) => {
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
        {!!addFunction && (
          <TouchableOpacity style={styles.rightElement} onPress={addFunction}>
            <Image source={icons.addIcon} style={styles.addIcon} />
          </TouchableOpacity>
        )}
      </>
    </GradientView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: getStatusBarHeight(),
    height: HEADER_HEIGHT + getStatusBarHeight(),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...typography.headline4,
    color: palette.white,
  },
  backArrowContainer: {
    position: 'absolute',
    height: HEADER_HEIGHT,
    width: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    top: getStatusBarHeight(),
    left: 10,
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
  addIcon: {
    height: 12,
    width: 12,
  },
  rightElement: {
    position: 'absolute',
    height: HEADER_HEIGHT,
    width: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    right: 10,
    top: getStatusBarHeight(),
  },
});
