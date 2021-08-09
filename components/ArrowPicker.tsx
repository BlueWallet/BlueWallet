/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import { StyleSheet, Pressable, View } from 'react-native';
import { Text, Icon } from 'react-native-elements';
import React, { useState } from 'react';

interface IHash {
  [key: string]: string;
}

type ArrowPickerProps = {
  onChange: (key: string) => void;
  items: IHash;
};

export const ArrowPicker = (props: ArrowPickerProps) => {
  const keys = Object.keys(props.items);
  const [keyIndex, setKeyIndex] = useState(0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={() => {
          let newIndex = keyIndex;
          if (keyIndex <= 0) {
            newIndex = keys.length - 1;
          } else {
            newIndex--;
          }
          setKeyIndex(newIndex);
          props.onChange(keys[newIndex]);
        }}
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? 'rgb(210, 230, 255)' : 'white',
          },
          styles.wrapperCustom,
        ]}
      >
        <Icon size={24} name="chevron-left" type="ionicons" />
      </Pressable>
      <View style={{ width: 200 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 12, textAlign: 'center' }}>{keys[keyIndex]}</Text>
      </View>
      <Pressable
        onPress={() => {
          let newIndex = keyIndex;
          if (keyIndex + 1 >= keys.length) {
            newIndex = 0;
          } else {
            newIndex++;
          }
          setKeyIndex(newIndex);
          props.onChange(keys[newIndex]);
        }}
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? 'rgb(210, 230, 255)' : 'white',
          },
          styles.wrapperCustom,
        ]}
      >
        <Icon size={24} name="chevron-right" type="ionicons" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapperCustom: {
    borderRadius: 8,
    padding: 5,
    marginLeft: 20,
    marginRight: 20,
  },
});
