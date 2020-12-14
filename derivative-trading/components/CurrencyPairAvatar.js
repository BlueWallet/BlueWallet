import PropTypes from 'prop-types';
import React from 'react';
import { Avatar } from 'react-native-elements';
import { getAvatarImageFromSymbol } from '../models/Product';

const CurrencyPairAvatar = ({ symbol, width, height, isRounded, containerStyles }) => {
  const _containerStyles = {
    width,
    height,
  };

  return <Avatar fadeDuration={0} rounded={isRounded} source={getAvatarImageFromSymbol(symbol)} containerStyle={[_containerStyles, containerStyles]} />;
};

CurrencyPairAvatar.propTypes = {
  symbol: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  isRounded: PropTypes.bool,
  containerStyles: PropTypes.object,
};

CurrencyPairAvatar.defaultProps = {
  width: 32,
  height: 32,
  isRounded: true,
  containerStyles: {},
};

export default CurrencyPairAvatar;
