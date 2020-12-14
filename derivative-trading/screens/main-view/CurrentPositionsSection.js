import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import loc from '../../../loc';
import EmptyListSectionView from '../../components/EmptyListSectionView';
import { BlueLoading } from '../../../BlueComponents';
import CurrentPositionListItem from './CurrentPositionListItem';
import RestApiClient from '../../class/RestApiClient';

const CurrentPositionsSection = ({ currentPositions, products, onPositionSelected, style, apiKey }) => {

  const SectionBody = () => {
    if (Object.values(currentPositions).length == 0) {
      return <EmptyListSectionView height={80} message={loc.derivatives_trading.current_positions.empty_list_message} />;
    } else {
      return Object.entries(currentPositions).map((position, index) => {
        let product = products.filter(product => product.symbol == position[1].symbol)[0];
        return (
          <CurrentPositionListItem
            key={index}
            positionSymbol={position[1].symbol}
            currentPosition={position[1]}
            product={product}
            onPress={() => {
              onPositionSelected(position[1]);
            }}
          />
        )
      });
    }
  };

  return (
    <View style={{ ...style }}>
      <SectionBody />
    </View>
  );
};

CurrentPositionsSection.propTypes = {
  style: PropTypes.object,
  currentPositions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onPositionSelected: PropTypes.func,
  apiKey: PropTypes.string.isRequired,
};

CurrentPositionsSection.defaultProps = {
  style: {},
  onPositionSelected: () => { },
};

export default React.memo(CurrentPositionsSection);
