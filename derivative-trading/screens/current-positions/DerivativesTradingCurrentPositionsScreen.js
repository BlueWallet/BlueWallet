import PropTypes from 'prop-types';
import React from 'react';
import { SectionList, Text, View } from 'react-native';
import loc from '../../../loc';
import ListSectionStyles from '../../class/styles/ListSectionStyles';
import NavbarStyles from '../../class/styles/NavbarStyles';
import DerivativesTradingPosition from '../../models/Position';
import { ProductKind } from '../../models/Product';
import CurrentPositionListItem from '../main-view/CurrentPositionListItem';

function keyExtractor(position) {
  return position.uID;
}

const DerivativesTradingCurrentPositionsScreen = ({
  navigation,
  route: {
    params: { positions, onPositionSelected },
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

  function renderListItem({ item: position, section }) {
    return (
      <CurrentPositionListItem
        position={position}
        onPress={() => {
          onPositionSelected(position);
        }}
      />
    );
  }

  return (
    <SectionList
      sections={[
        {
          title: `${loc.derivatives_trading.product_kind.cfd}s`,
          data: positions.filter(position => position.productKind === ProductKind.CFD),
        },
        // {
        //   title: `${loc.derivatives_trading.product_kind.perpetual}s`,
        //   data: positions.filter(position => position.productKind === ProductKind.PERPETUAL),
        // },
        {
          title: `${loc.derivatives_trading.product_kind.quanto}s`,
          data: positions.filter(position => position.productKind === ProductKind.QUANTO)
        },
      ]}
      stickySectionHeadersEnabled={false}
      keyExtractor={keyExtractor}
      renderItem={renderListItem}
      renderSectionHeader={renderSectionHeader}
    />
  );
};

DerivativesTradingCurrentPositionsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      positions: PropTypes.arrayOf(DerivativesTradingPosition).isRequired,
      onPositionSelected: PropTypes.func.isRequired,
    }),
  }),
};

DerivativesTradingCurrentPositionsScreen.navigationOptions = () => ({
  // ...BlueNavigationStyle(navigation, true),
  headerTitle: () => {
    return <Text style={NavbarStyles.navHeaderTitle}>{loc.derivatives_trading.current_positions.title}</Text>;
  },
  headerBackTitleVisible: false,
});

export default DerivativesTradingCurrentPositionsScreen;
