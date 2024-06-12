import React from 'react';
import { requireNativeComponent, View, StyleSheet, NativeSyntheticEvent } from 'react-native';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

interface SegmentedControlEvent {
  selectedIndex: number;
}

interface NativeSegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChangeEvent: (event: NativeSyntheticEvent<SegmentedControlEvent>) => void;
  style?: object;
}

const NativeSegmentedControl = requireNativeComponent<NativeSegmentedControlProps>('CustomSegmentedControl');

const SegmentedControl: React.FC<SegmentedControlProps> = ({ values, selectedIndex, onChange }) => {
  const handleChange = (event: NativeSyntheticEvent<SegmentedControlEvent>) => {
    onChange(event.nativeEvent.selectedIndex);
  };

  return (
    <View style={styles.container}>
      <NativeSegmentedControl values={values} selectedIndex={selectedIndex} style={styles.segmentedControl} onChangeEvent={handleChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 18,
  },
  segmentedControl: {
    height: 40,
  },
});

export default SegmentedControl;
