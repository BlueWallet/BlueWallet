import React from 'react';
import { ScrollView, StatusBar, StyleSheet, KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-navigation';

import { getStatusBarHeight, palette } from 'app/styles';

enum StatusBarColor {
  Light = 'light-content',
  Dark = 'dark-content',
}

interface Props {
  children: React.ReactNode;
  footer?: React.ReactNode;
  statusBarStyle: StatusBarColor;
  contentContainer?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement;
}

export class ScreenTemplate extends React.PureComponent<Props> {
  static StatusBarColor = StatusBarColor;

  static defaultProps = {
    statusBarStyle: StatusBarColor.Light,
  };

  render() {
    const { children, footer, statusBarStyle, contentContainer, refreshControl } = this.props;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={statusBarStyle} />
        <ScrollView contentContainerStyle={[styles.contentContainer, contentContainer]} refreshControl={refreshControl}>
          {children}
        </ScrollView>
        {!!footer && (
          <KeyboardAvoidingView
            keyboardVerticalOffset={getStatusBarHeight() + 52}
            behavior={Platform.OS == 'ios' ? 'padding' : undefined}
            style={styles.footer}
          >
            {footer}
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  footer: {
    paddingHorizontal: 20,
    backgroundColor: palette.white,
    marginBottom: 12,
  },
});
