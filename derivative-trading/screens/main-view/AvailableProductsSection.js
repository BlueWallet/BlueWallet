import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import loc from '../../../loc';
import AvailableProductListItem from './AvailableProductListItem';
import { BlueLoading } from '../../../BlueComponents';
import EmptyListSectionView from '../../components/EmptyListSectionView';

const AvailableProductsSection = ({
  products,
  productCharts,
  isLoadingCharts,
  onProductSelected,
  style,
}) => {

  const SectionBody = () => {
    if (isLoadingCharts ) {
      return <BlueLoading paddingTop={40} paddingBottom={40} />;
    } else if (products.length === 0) {
      return <EmptyListSectionView height={80} message={loc.derivatives_trading.available_products.empty_list_message} />;
    } else {
      return Object.values(productCharts)
        .map((item, index) => (
          <AvailableProductListItem
            key={index}
            product={item.product}
            onPress={() => {
              onProductSelected(item.product);
            }}
            indexPriceHistory={item.chart}
          />
        ));
    }
  };

  return (
    <View style={{ ...style }}>
      <SectionBody />
    </View>
  );
};

AvailableProductsSection.propTypes = {
  style: PropTypes.object,
  products: PropTypes.arrayOf(PropTypes.object).isRequired,
  productCharts: PropTypes.object.isRequired,
  isLoadingCharts: PropTypes.bool.isRequired,
  onProductSelected: PropTypes.func,
};

AvailableProductsSection.defaultProps = {
  style: {backgroundColor: 'black'},
  onProductSelected: () => {},
  onSeeAllTapped: () => {},
};

export default React.memo(AvailableProductsSection);
