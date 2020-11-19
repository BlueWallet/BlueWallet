import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { Platform, StyleSheet, TouchableOpacity, BackHandler, NativeEventSubscription } from 'react-native';

import { images, icons } from 'app/assets';
import { getStatusBarHeight, palette, typography } from 'app/styles';

import { EllipsisText } from './EllipsisText';
import { FlatButton } from './FlatButton';
import { GradientView } from './GradientView';
import { Image } from './Image';

const i18n = require('../../loc');

export const HEADER_HEIGHT = Platform.select({
  ios: 44,
  android: 38,
}) as number;

interface Props {
  navigation?: StackNavigationProp<any, any>;
  title?: string;
  isBackArrow?: boolean;
  onBackArrow?: () => void;
  isCancelButton?: boolean;
  addFunction?: () => void;
}

export class Header extends PureComponent<Props> {
  backHandler?: NativeEventSubscription;

  onLeftItemPress = () => (this.props.onBackArrow ? this.props.onBackArrow() : this.props.navigation!.pop());
  renderBackArrow = () => <Image style={styles.image} source={images.backArrow} />;
  renderCancelButton = () => (
    <FlatButton onPress={this.onLeftItemPress} titleStyle={typography.headline4} title={i18n.send.details.cancel} />
  );

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
    const { isBackArrow, isCancelButton } = this.props;
    const leftItem = isBackArrow ? this.renderBackArrow() : isCancelButton ? this.renderCancelButton() : undefined;

    if (leftItem) {
      return (
        <TouchableOpacity
          style={isBackArrow ? styles.backArrowContainer : styles.cancelButtonContainer}
          onPress={this.onLeftItemPress}
        >
          {leftItem}
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
