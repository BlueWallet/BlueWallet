import React, { useMemo } from 'react';
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
  const handleChange = useMemo(
    () => (event: NativeSyntheticEvent<SegmentedControlEvent>) => {
      if (event?.nativeEvent?.selectedIndex !== undefined) {
        onChange(event.nativeEvent.selectedIndex);
      }
    },
    [onChange],
  );

  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <NativeSegmentedControl values={values} selectedIndex={selectedIndex} style={styles.segmentedControl} onChangeEvent={handleChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginHorizontal: 18,
    marginBottom: 18,
    minHeight: 40,
  },
  segmentedControl: {
    height: 40,
  },
});

export default SegmentedControl;
