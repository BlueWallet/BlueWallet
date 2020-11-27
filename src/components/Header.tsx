import React, { PureComponent } from 'react';
import { Platform, StyleSheet, TouchableOpacity, BackHandler, NativeEventSubscription } from 'react-native';

import { images, icons } from 'app/assets';
import { NavigationService } from 'app/services';
import { getStatusBarHeight, palette, typography } from 'app/styles';

import { EllipsisText } from './EllipsisText';
import { GradientView } from './GradientView';
import { Image } from './Image';

export const HEADER_HEIGHT = Platform.select({
  ios: 44,
  android: 38,
}) as number;

interface Props {
  title?: string;
  isBackArrow?: boolean;
  onBackArrow?: () => void;
  addFunction?: () => void;
}

export class Header extends PureComponent<Props> {
  backHandler?: NativeEventSubscription;

  onLeftItemPress = () => (this.props.onBackArrow ? this.props.onBackArrow() : NavigationService.goBack());

  componentDidMount() {
    this.backHandler = BackHandler.addEventListener('hardwareBackPress', this.backAction);
  }

  componentWillUnmount() {
    this.backHandler && this.backHandler.remove();
  }

  backAction = () => {
    this.props.onBackArrow && this.props.onBackArrow();
    return false;
  };

  renderLeftItem = () => {
    const { isBackArrow } = this.props;

    if (isBackArrow) {
      return (
        <TouchableOpacity style={styles.backArrowContainer} onPress={this.onLeftItemPress}>
          <Image style={styles.image} source={images.backArrow} />
        </TouchableOpacity>
      );
    }
  };
  render() {
    const { title, addFunction } = this.props;

    return (
      <GradientView variant={GradientView.Variant.Primary} style={styles.container}>
        <>
          {this.renderLeftItem()}
          <EllipsisText style={styles.title}>{title}</EllipsisText>
          {!!addFunction && (
            <TouchableOpacity style={styles.rightElement} onPress={addFunction}>
              <Image source={icons.addIcon} style={styles.addIcon} />
            </TouchableOpacity>
          )}
        </>
      </GradientView>
    );
  }
}
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
