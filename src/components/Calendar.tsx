import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Calendar as RNCalendar, DateObject } from 'react-native-calendars';
import { Overlay } from 'react-native-elements';

import { images } from 'app/assets';

interface Props {
  isVisible: boolean;
  onDateSelect: (date: DateObject) => void;
  onClose: () => void;
}

export const Calendar = ({ isVisible, onDateSelect, onClose }: Props) => (
  <Overlay isVisible={isVisible}>
    <>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Image source={images.close} style={styles.closeImage} />
      </TouchableOpacity>
      <RNCalendar minDate={'2019-12-12'} onDayPress={onDateSelect} firstDay={1} />
    </>
  </Overlay>
);

const styles = StyleSheet.create({
  closeButton: { padding: 10, alignSelf: 'flex-end' },
  closeImage: { height: 25, width: 25 },
});
