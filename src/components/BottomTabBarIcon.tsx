import React from 'react';
import FastImage, { FastImageSource } from 'react-native-fast-image';
import { StyleSheet } from 'react-native';

export interface BottomTabBarIconProps {
  source: FastImageSource;
}

export class BottomTabBarIcon extends React.PureComponent<BottomTabBarIconProps> {
  render() {
    const { source } = this.props;
    return <FastImage source={source} style={styles.image} />;
  }
}

const styles = StyleSheet.create({
  image: {
    width: 18,
    height: 18,
    marginTop: 12,
    marginBottom: 6,
  },
});
