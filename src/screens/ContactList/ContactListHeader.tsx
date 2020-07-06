import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { icons, images } from 'app/assets';
import { GradientView, Image } from 'app/components';
import { HEADER_HEIGHT } from 'app/components/Header';
import { getStatusBarHeight, palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  onAddButtonPress?: () => void;
  children: React.ReactNode;
  onBackArrowPress?: () => void;
  title?: string;
}

export class ContactListHeader extends React.PureComponent<Props> {
  render() {
    const { onAddButtonPress, onBackArrowPress, title } = this.props;
    return (
      <GradientView variant={GradientView.Variant.Primary} style={styles.container}>
        <View style={styles.header}>
          {!!onBackArrowPress && (
            <TouchableOpacity style={styles.leftElement} onPress={onBackArrowPress}>
              <Image style={styles.backIcon} source={images.backArrow} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{title ? title : i18n.contactList.screenTitle}</Text>
          {!!onAddButtonPress && (
            <TouchableOpacity style={styles.rightElement} onPress={onAddButtonPress}>
              <Image source={icons.addIcon} style={styles.addIcon} />
            </TouchableOpacity>
          )}
        </View>
        {this.props.children}
      </GradientView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingTop: getStatusBarHeight(),
    height: HEADER_HEIGHT + 60 + getStatusBarHeight(),
    width: '100%',
  },
  header: {
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headline4,
    color: palette.white,
  },
  addIcon: {
    height: 12,
    width: 12,
  },
  backIcon: {
    width: 8,
    height: 13,
  },
  rightElement: {
    position: 'absolute',
    height: HEADER_HEIGHT,
    width: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    right: 10,
    top: 0,
  },
  leftElement: {
    position: 'absolute',
    height: HEADER_HEIGHT,
    width: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    top: 0,
    left: 10,
  },
});
