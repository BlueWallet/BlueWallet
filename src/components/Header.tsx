import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';

import { images, icons } from 'app/assets';
import { getStatusBarHeight, palette, typography } from 'app/styles';

import { FlatButton } from './FlatButton';
import { GradientView } from './GradientView';
import { Image } from './Image';

export const HEADER_HEIGHT = Platform.select({
  ios: 44,
  android: 38,
}) as number;

interface Props extends Partial<NavigationScreenProps> {
  title: string;
  isBackArrow?: boolean;
  onBackArrow?: () => void;
  isCancelButton?: boolean;
  addFunction?: () => void;
}

export const Header = ({ title, isBackArrow, isCancelButton, navigation, addFunction, onBackArrow }: Props) => {
  const onLeftItemPress = () => (onBackArrow ? onBackArrow() : navigation!.pop());
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
          onPress={onLeftItemPress}
        >
          {leftItem}
        </TouchableOpacity>
      );
    }
  };

  return (
    <GradientView variant={GradientView.Variant.Primary} style={styles.container}>
      <>
        {renderLeftItem()}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
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
    paddingHorizontal: 40,
  },
  backArrowContainer: {
    position: 'absolute',
    height: HEADER_HEIGHT,
    width: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    top: getStatusBarHeight(),
    left: 10,
    zIndex: 10,
  },
  cancelButtonContainer: {
    position: 'absolute',
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    top: getStatusBarHeight(),
    left: 16,
    zIndex: 10,
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
    zIndex: 10,
  },
});
