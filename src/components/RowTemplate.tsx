import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  items: React.ReactNode[];
}

export const RowTemplate = ({ items }: Props) => (
  <View style={styles.container}>
    {items.map((item, index) => (
      <View
        key={index}
        style={[
          styles.itemContainer,
          items.length > 1
            ? index === 0
              ? { marginRight: 10 }
              : index < items.length - 1
              ? { marginLeft: 10, marginRight: 10 }
              : { marginLeft: 10 }
            : {},
        ]}
      >
        {item}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  itemContainer: {
    flexGrow: 1,
    flexBasis: 0,
  },
});
