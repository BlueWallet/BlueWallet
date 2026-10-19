import React, { useCallback } from 'react';
import { View, StyleSheet, NativeSyntheticEvent } from 'react-native';
import NativeSegmentedControl from '../codegen/SegmentedControlNativeComponent';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  testID?: string;
  /** Use the platform control instead of the accent color override. */
  usePlatformStyle?: boolean;
}

interface SegmentedControlEvent {
  selectedIndex: number;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ values, selectedIndex, onChange, testID, usePlatformStyle = false }) => {
  const handleChange = useCallback(
    (event: NativeSyntheticEvent<SegmentedControlEvent>) => {
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
      <NativeSegmentedControl
        values={values}
        selectedIndex={selectedIndex}
        enabled
        backgroundColor={usePlatformStyle ? undefined : 'transparent'}
        tintColor={usePlatformStyle ? undefined : '#007AFF'}
        textColor={usePlatformStyle ? undefined : '#007AFF'}
        momentary={false}
        style={styles.segmentedControl}
        onChange={handleChange}
        testID={testID}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginHorizontal: 0,
    marginBottom: 18,
    minHeight: 40,
  },
  segmentedControl: {
    height: 40,
  },
});

export default SegmentedControl;
