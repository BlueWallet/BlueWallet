import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  View,
} from 'react-native';
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
  noScroll?: boolean;
}

export class ScreenTemplate extends React.PureComponent<Props> {
  static StatusBarColor = StatusBarColor;

  static defaultProps = {
    statusBarStyle: StatusBarColor.Light,
  };

  render() {
    const { children, footer, statusBarStyle, contentContainer, refreshControl, noScroll } = this.props;
    const Container = noScroll ? View : ScrollView;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={statusBarStyle} />
        <Container
          style={[noScroll && styles.contentContainer, noScroll && contentContainer]}
          contentContainerStyle={[styles.contentContainer, contentContainer]}
          refreshControl={refreshControl}
        >
          {children}
        </Container>
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
