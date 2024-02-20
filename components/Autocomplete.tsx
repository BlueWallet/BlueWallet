import React, { useState } from 'react';
import { TouchableOpacity, View, TextInput, StyleProp, ViewStyle, ScrollView } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from './themes';

// Define an interface for the props
interface AutocompleteProps {
  value?: string,
  data?: string,
  containerStyle?: StyleProp<ViewStyle>,
  placeholder?: string,
  onChange?: () => void,
  style?: StyleProp<ViewStyle>,
  menuStyle?: StyleProp<ViewStyle>,
}

export const Autocomplete: React.FC<AutocompleteProps> = props => {
  const [value, setValue] = useState(origValue);
  const [menuVisible, setMenuVisible] = useState(true);
  const [filteredData, setFilteredData] = useState([...data.sort()]);

  const filterData = text => {
    return data.filter(val => (text != null && text.length > 0 ? val?.toLowerCase()?.indexOf(text?.toLowerCase()) > -1 : true)).sort();
  };

  return (
    <View style={containerStyle}>
      <TextInput
        // onBlur={() => setMenuVisible(false)}
        style={[style, { textAlign: 'center', fontSize: 35 }]}
        onChangeText={text => {
          origOnChange(text);
          if (text != null) {
            setFilteredData(filterData(text));
          }
          setMenuVisible(true);
          setValue(text);
        }}
        value={value}
        placeholder={placeholder}
      />
      {menuVisible && filteredData.length > 0 ? (
        <ScrollView
          style={{
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {filteredData.map((datum, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setValue(datum);
                setMenuVisible(false);
                origOnChange(datum);
              }}
              style={{ width: '100%' }}
            >
              <BlueText>{datum}</BlueText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};

export default Autocomplete;
