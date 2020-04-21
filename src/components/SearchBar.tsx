import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { palette } from 'app/styles';

export class SearchBar extends React.PureComponent {
  render() {
    return (
      <View style={styles.container}>
        <TextInput style={styles.textInput} />
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
  },
  textInput: {
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.searchBar,
  },
});
