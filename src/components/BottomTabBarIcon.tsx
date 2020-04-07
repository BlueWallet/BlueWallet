import React from 'react';
import { Image, FastImageSource } from './Image';
import { StyleSheet } from 'react-native';

export interface BottomTabBarIconProps {
  source: FastImageSource;
}

export class BottomTabBarIcon extends React.PureComponent<BottomTabBarIconProps> {
  render() {
    const { source } = this.props;
    return <Image source={source} style={styles.image} />;
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
