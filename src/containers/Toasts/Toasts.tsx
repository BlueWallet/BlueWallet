import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

import { CustomToast } from 'app/components';
import { selectors, actions } from 'app/state/toastMessages';

export const Toasts = () => {
  const toastMessages = useSelector(selectors.toastMessages);
  const dispatch = useDispatch();

  return (
    <View style={styles.outerContainer}>
      {toastMessages.map(toast => (
        <CustomToast key={toast.id} toast={toast} onClose={() => dispatch(actions.hideToastMessage(toast))} />
      ))}
    </View>
  );
};

export default Toasts;

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
  },
});
