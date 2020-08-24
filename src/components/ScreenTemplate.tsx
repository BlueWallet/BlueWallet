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
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CONST } from 'app/consts';
import { palette } from 'app/styles';
import { ifIphoneX, isIos } from 'app/styles/helpers';

enum StatusBarColor {
  Light = 'light-content',
  Dark = 'dark-content',
}

interface Props {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  statusBarStyle: StatusBarColor;
  contentContainer?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement;
  noScroll?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}

export class ScreenTemplate extends React.PureComponent<Props> {
  static StatusBarColor = StatusBarColor;

  static defaultProps = {
    statusBarStyle: StatusBarColor.Light,
  };

  scrollRef = React.createRef<ScrollView>();

  render() {
    const {
      children,
      header,
      footer,
      statusBarStyle,
      contentContainer,
      refreshControl,
      noScroll,
      keyboardShouldPersistTaps,
    } = this.props;
    const Container = noScroll ? View : ScrollView;
    return (
      <SafeAreaProvider style={styles.container}>
        <StatusBar barStyle={statusBarStyle} />
        {header}
        <Container
          ref={this.scrollRef}
          style={[noScroll && styles.contentContainer, noScroll && contentContainer]}
          contentContainerStyle={[styles.contentContainer, contentContainer]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          {children}
        </Container>
        {!!footer && (
          <KeyboardAvoidingView
            behavior={isIos() ? 'padding' : undefined}
            style={styles.footer}
            keyboardVerticalOffset={20}
          >
            {footer}
          </KeyboardAvoidingView>
        )}
      </SafeAreaProvider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
    paddingBottom: ifIphoneX(34, 0),
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
