import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export class AddressBookScreen extends PureComponent {
  render() {
    return (
      <View style={styles.container}>
        <Text>The Screen is under construction at the moment</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
