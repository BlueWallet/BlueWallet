import React from 'react';
import { Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { icons, images } from 'app/assets';
import { FlatButton } from 'app/components/FlatButton';
import { defaultKeyboardType } from 'app/consts';
import { palette, typography } from 'app/styles';

import { Image } from './Image';

const i18n = require('../../loc');

interface Props {
  query: string;
  setQuery: (query: string) => void;
  onFocus?: () => void;
}

interface State {
  focused: boolean;
}

export class SearchBar extends React.PureComponent<Props, State> {
  state: State = {
    focused: false,
  };

  clear = () => this.props.setQuery('');

  cancelSearch = () => Keyboard.dismiss();

  focus = () => {
    if (this.props.onFocus) {
      this.props.onFocus();
    }
    this.setState({ focused: true });
  };

  blur = () => this.setState({ focused: false });

  render() {
    const { focused } = this.state;
    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <Image source={icons.search} style={styles.searchIcon} />
          <TextInput
            onChangeText={this.props.setQuery}
            value={this.props.query}
            autoCorrect={false}
            selectionColor={palette.secondary}
            style={styles.textInput}
            onFocus={this.focus}
            onBlur={this.blur}
            placeholderTextColor={palette.textWhiteMuted}
            placeholder={i18n.contactList.search}
            keyboardType={defaultKeyboardType}
            autoCapitalize="none"
          />
          {!!this.props.query && (
            <TouchableOpacity style={styles.clearButton} onPress={this.clear}>
              <Image source={images.cancelSmall} style={styles.clearImage} />
            </TouchableOpacity>
          )}
        </View>
        {focused && (
          <FlatButton
            onPress={this.cancelSearch}
            containerStyle={styles.cancelButtonContainer}
            titleStyle={typography.headline4}
            title={i18n.contactList.cancel}
          />
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    paddingBottom: 16,
    paddingTop: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  textInput: {
    flex: 1,
    ...typography.subtitle1,
    color: palette.white,
  },
  inputContainer: {
    backgroundColor: palette.searchBar,
    height: 40,
    borderRadius: 10,
    paddingStart: 46,
    paddingEnd: 46,
    flex: 1,
  },
  searchIcon: {
    width: 22,
    height: 22,
    position: 'absolute',
    left: 12,
    top: 8,
  },
  cancelButtonContainer: {
    marginStart: 12,
  },
  clearButton: {
    height: 36,
    width: 36,
    position: 'absolute',
    top: 0,
    right: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearImage: {
    width: 14,
    height: 14,
  },
});
