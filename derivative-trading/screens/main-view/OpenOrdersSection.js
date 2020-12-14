import PropTypes from 'prop-types';
import React from 'react';
import { View } from 'react-native';
import loc from '../../../loc';
import EmptyListSectionView from '../../components/EmptyListSectionView';
import OpenedOrderListItem from './OpenedOrderListItem';


const OpenOrdersSection = ({ openOrders, onOrderSelected, style, products, apiKey }) => {

  const SectionBody = () => {
    if (openOrders.length === 0) {
      return <EmptyListSectionView height={80} message={loc.derivatives_trading.open_orders.empty_list_message} />;
    } else {
      return openOrders.map((order, index) => {
        let product = products.filter(product => product.symbol === order.symbol)[0];
        return <OpenedOrderListItem
          key={index}
          order={order}
          apiKey={apiKey}
          product={product}
          onPress={() => {
            onOrderSelected(order);
          }}
        />
      });
    }
  };

  return (
    <View style={{ ...style }}>
      <SectionBody />
    </View>
  );
};

OpenOrdersSection.propTypes = {
  style: PropTypes.object,
  openOrders: PropTypes.arrayOf(PropTypes.object).isRequired,
  onOrderSelected: PropTypes.func,
};

OpenOrdersSection.defaultProps = {
  style: {},
  onOrderSelected: () => { },
  onSeeAllTapped: () => { },
};

export default React.memo(OpenOrdersSection);
