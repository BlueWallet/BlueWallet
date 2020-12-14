import PropTypes from 'prop-types';
import React from 'react';
import { SectionList, Text, View } from 'react-native';
import loc from '../../../loc';
import ListSectionStyles from '../../class/styles/ListSectionStyles';
import NavbarStyles from '../../class/styles/NavbarStyles';
import { ProductKind } from '../../models/Product';
import AvailableProductListItem from '../main-view/AvailableProductListItem';


function keyExtractor({ product }) {
  return product.symbol;
}

const DerivativesTradingProductsScreen = ({
  navigation,
  route: {
    params: { products, onProductSelected, productCharts },
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

  function renderListItem({ item: productChart, section }) {
    return (
      <AvailableProductListItem
        product={productChart.product}
        onPress={() => {
          onProductSelected(productChart.product);
        }}
        indexPriceHistory={productChart.chart}
      />
    );
  }

  return (
    <SectionList
      sections={[
        {
          title: `${loc.derivatives_trading.product_kind.cfd}s`,
          data: Object.values(productCharts).filter(productCharts => productCharts.product.productKind === ProductKind.CFD),
        },
        // {
        //   title: `${loc.derivatives_trading.product_kind.perpetual}s`,
        //   data: products.filter(product => product.productKind === ProductKind.PERPETUAL),
        // },
        {
          title: `${loc.derivatives_trading.product_kind.quanto}s`,
          data: Object.values(productCharts).filter(productChart => productChart.product.productKind === ProductKind.QUANTO),
        },
      ]}
      stickySectionHeadersEnabled={false}
      keyExtractor={keyExtractor}
      renderItem={renderListItem}
      renderSectionHeader={renderSectionHeader}
    />
  );
};

DerivativesTradingProductsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      products: PropTypes.arrayOf(PropTypes.object).isRequired,
      productCharts: PropTypes.object,
      onProductSelected: PropTypes.func.isRequired,
    }),
  }),
};

DerivativesTradingProductsScreen.navigationOptions = () => ({
  // ...BlueNavigationStyle(navigation, true),
  headerTitle: () => {
    return <Text style={NavbarStyles.navHeaderTitle}>{loc.derivatives_trading.available_products.title}</Text>;
  },
  headerBackTitleVisible: false,
});

export default DerivativesTradingProductsScreen;
