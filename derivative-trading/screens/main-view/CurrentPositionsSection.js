import PropTypes from 'prop-types';
import React from 'react';
import { View } from 'react-native';
import loc from '../../../loc';
import EmptyListSectionView from '../../components/EmptyListSectionView';
import CurrentPositionListItem from './CurrentPositionListItem';

const CurrentPositionsSection = ({ currentPositions, products, onPositionSelected, style }) => {

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
  onPositionSelected: PropTypes.func,
};

CurrentPositionsSection.defaultProps = {
  style: {},
  onPositionSelected: () => { },
};

export default React.memo(CurrentPositionsSection);
