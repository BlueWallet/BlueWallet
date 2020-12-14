import React from 'react';
import PropTypes from 'prop-types';
import loc from '../../../loc';
import { View, Text, SectionList } from 'react-native';
import NavbarStyles from '../../class/styles/NavbarStyles';
import ListSectionStyles from '../../class/styles/ListSectionStyles';
import { ProductKind } from '../../models/Product';
import DerivativesTradingOpenedOrder from '../../models/OpenedOrder';
import OpenedOrderListItem from '../main-view/OpenedOrderListItem';

function keyExtractor(position) {
  return position.uID;
}

const DerivativesTradingOpenOrdersScreen = ({
  navigation,
  route: {
    params: { orders, onOrderSelected },
  },
}) => {
  function renderSectionHeader({ section: { title } }) {
    return (
      <View style={ListSectionStyles.header}>
        <View>
          <Text style={ListSectionStyles.headingTitle}>{title}</Text>
          {/* 📝 TODO: Add explainer tooltip button here */}
        </View>
      </View>
    );
  }

  function renderListItem({ item: order, section }) {
    return (
      <OpenedOrderListItem
        order={order}
        onPress={() => {
          onOrderSelected(order);
        }}
      />
    );
  }

  return (
    <SectionList
      sections={[
        {
          title: `${loc.derivatives_trading.product_kind.cfd}s`,
          data: orders.filter(order => order.productKind === ProductKind.CFD),
        },
        // {
        //   title: `${loc.derivatives_trading.product_kind.perpetual}s`,
        //   data: orders.filter(order => order.productKind === ProductKind.PERPETUAL),
        // },
        {
          title: `${loc.derivatives_trading.product_kind.quanto}s`,
          data: orders.filter(order => order.productKind === ProductKind.QUANTO),
        },
      ]}
      stickySectionHeadersEnabled={false}
      keyExtractor={keyExtractor}
      renderItem={renderListItem}
      renderSectionHeader={renderSectionHeader}
    />
  );
};

DerivativesTradingOpenOrdersScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      orders: PropTypes.arrayOf(DerivativesTradingOpenedOrder).isRequired,
      onOrderSelected: PropTypes.func.isRequired,
    }),
  }),
};

DerivativesTradingOpenOrdersScreen.navigationOptions = () => ({
  // ...BlueNavigationStyle(navigation, true),
  headerTitle: () => {
    return <Text style={NavbarStyles.navHeaderTitle}>{loc.derivatives_trading.open_orders.title}</Text>;
  },
  headerStyle: {
    backgroundColor: 'black',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOffset: { height: 0, width: 0 },
  },
  headerTintColor: '#FFFFFF',
  headerBackTitleVisible: false,
});

export default DerivativesTradingOpenOrdersScreen;
