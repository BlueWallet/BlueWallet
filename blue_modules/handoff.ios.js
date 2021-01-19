import React, { useContext } from 'react';
import Handoff from 'react-native-handoff';
import { BlueStorageContext } from './storage-context';
import PropTypes from 'prop-types';

const HandoffComponent = props => {
  const { isHandOffUseEnabled } = useContext(BlueStorageContext);

  return isHandOffUseEnabled && props && props.url ? <Handoff {...props} /> : null;
};
HandoffComponent.STORAGE_KEY = 'HandOff';
export default HandoffComponent;

HandoffComponent.propTypes = {
  url: PropTypes.string,
};
