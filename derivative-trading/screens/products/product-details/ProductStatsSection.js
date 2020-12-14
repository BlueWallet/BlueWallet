import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ListSectionStyles from '../../../class/styles/ListSectionStyles';
import TradingDataStyles from '../../../class/styles/TradingDataStyles';

const ProductStatsSection = ({ product }) => {
  return (
    <View>
      <View style={[ListSectionStyles.header, styles.sectionHeader]}>
        <View style={ListSectionStyles.headingTitleWithIconGroup}>
          {/* <Icon style={ListSectionStyles.headingTitleIcon} name="light-bulb" type="octicon" /> */}
          <Text style={ListSectionStyles.headingTitle}>Contract Details</Text>
        </View>
      </View>

      <View style={styles.dataSection}>
        {/* Row 1 */}
        <View style={[styles.dataRow, styles.marginedRow]}>
          <View style={[TradingDataStyles.labeledDataVGroup, TradingDataStyles.dataGroup50]}>
            <Text style={TradingDataStyles.dataItemLabel}>Contract Value</Text>
            {
              product.isInversePriced ? (
                <Text style={TradingDataStyles.dataItemValue}>{product.contractSize} USD</Text>
              ) : (
                  <Text style={TradingDataStyles.dataItemValue}>{product.contractSize} Sats / $</Text>
                )
            }
          </View>

          <View style={[TradingDataStyles.labeledDataVGroup, TradingDataStyles.dataGroup50]}>
            <Text style={TradingDataStyles.dataItemLabel}>Base Index</Text>
            <Text style={TradingDataStyles.dataItemValue}>{product.underlyingSymbol}</Text>
          </View>
        </View>

        {/* Row 2 */}
        <View style={styles.dataRow}>
          <View style={[TradingDataStyles.labeledDataVGroup, TradingDataStyles.dataGroup50]}>
            <Text style={TradingDataStyles.dataItemLabel}>Maximum Leverage</Text>
            <Text style={TradingDataStyles.dataItemValue}>{product.maxLeverage}x</Text>
          </View>

          <View style={[TradingDataStyles.labeledDataVGroup, TradingDataStyles.dataGroup50]}>
            <Text style={TradingDataStyles.dataItemLabel}>Maint Margin</Text>
            <Text style={TradingDataStyles.dataItemValue}>{product.maintenanceMargin * 100}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 14,
  },

  dataSection: {
    paddingHorizontal: 14,
  },

  dataRow: {
    flexDirection: 'row',
  },

  marginedRow: {
    marginBottom: 24,
  },
});

ProductStatsSection.propTypes = {
  product: PropTypes.object.isRequired,
};

export default ProductStatsSection;
