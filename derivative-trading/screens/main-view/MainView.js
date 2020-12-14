import React, { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
// import TabViewExample from '../../components/TabView';
import { TabBar, TabView } from 'react-native-tab-view';
import { convertToChartData } from '../../class/Utils';
import BalanceChartView from '../../components/BalanceChartView';
import AvailableProductsSection from './AvailableProductsSection';
import CurrentPositionsSection from './CurrentPositionsSection';
import OpenOrdersSection from './OpenOrdersSection';
import TradesSection from './TradesSection';


const initialLayout = { width: Dimensions.get('window').width };

function MainView({
  wallet,
  products,
  isLoadingCharts,
  productCharts,
  onProductSelected,
  onPositionSelected,
  onOpenOrderSelected,
  currentPositions,
  openOrders,
  apiKey,
}) {
  const [tabIndex, setTabIndex] = useState(0);

  const [tabRoutes] = useState([
    { key: 'first', title: 'Products' },
    { key: 'second', title: 'Positions' },
    { key: 'third', title: 'Orders' },
    { key: 'fourth', title: 'Trades' },
  ]);

  const renderTabScene = ({ route }) => {
    switch (route.key) {
      case 'first':
        return (
          <AvailableProductsSection style={styles.nonLastListSection} products={products} productCharts={productCharts} isLoadingCharts={isLoadingCharts} onProductSelected={onProductSelected} />
        );
      case 'second':
        return (
          <CurrentPositionsSection currentPositions={currentPositions} style={styles.nonLastListSection} products={products} onPositionSelected={onPositionSelected} apiKey={apiKey} />
        );
      case 'third':
        return (
          <OpenOrdersSection openOrders ={openOrders} onOrderSelected={onOpenOrderSelected} products={products} apiKey={apiKey} />
        );
      case 'fourth':
        return (
          <TradesSection style={styles.nonLastListSection} products={products} apiKey={apiKey} />
        );
      default:
        return (

          <AvailableProductsSection style={styles.nonLastListSection} products={products} productCharts={productCharts} isLoadingCharts={isLoadingCharts} onProductSelected={onProductSelected} />
        )
    }
  };

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: 'white' }}
      contentContainerStyle={{ padding: 0 }}
      labelStyle={{ textTransform: 'lowercase', margin: 0 }}
      style={{ backgroundColor: 'black' }}
    />
  )

  return (
    <ScrollView>
      <View style={[styles.nonLastListSection, styles.mainChartSection]}>
        <BalanceChartView chart={convertToChartData(productCharts['XBTUSD.CFD'].chart)} />
      </View>

      <TabView
        lazy
        renderTabBar={renderTabBar}
        navigationState={{ index: tabIndex, routes: tabRoutes }}
        renderScene={renderTabScene}
        onIndexChange={setTabIndex}
        initialLayout={initialLayout}
      />

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  mainChartContainer: {},

  nonLastListSection: {
    marginBottom: 0,
    color: 'white',
  },

  scene: {
    flex: 1,
    height: 500
  },
});

export default MainView;
