import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { icons } from 'app/assets';
import { GradientView, Image } from 'app/components';
import { HEADER_HEIGHT } from 'app/components/Header';
import { getStatusBarHeight, palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  onFilterPress: () => void;
  children: React.ReactNode;
  onAddPress: () => void;
}

export class DashboardHeader extends React.PureComponent<Props> {
  render() {
    const { onAddPress, onFilterPress } = this.props;
    return (
      <GradientView variant={GradientView.Variant.Primary} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity testID="filter-transactions-button" style={styles.leftElement} onPress={onFilterPress}>
            <Image style={styles.icon} source={icons.filter} />
          </TouchableOpacity>
          <Text style={styles.title}>{i18n.wallets.dashboard.title}</Text>
          <TouchableOpacity style={styles.rightElement} onPress={onAddPress}>
            <Image source={icons.addIcon} style={styles.icon} />
          </TouchableOpacity>
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
  icon: {
    height: 20,
    width: 20,
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
