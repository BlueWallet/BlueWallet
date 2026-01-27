import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import PortfolioChart from '../../components/portfolio/PortfolioChart';
import PortfolioMetrics from '../../components/portfolio/PortfolioMetrics';
import FeesDisplay from '../../components/portfolio/FeesDisplay';
import PortfolioTotalBalance from '../../components/portfolio/PortfolioTotalBalance';
import { PortfolioCalculator, TimeRange, PortfolioMetrics as PortfolioMetricsType, FeesData } from '../../class/portfolio/portfolio-calculator';
import { UtxoTracker } from '../../class/portfolio/utxo-tracker';
import { PriceService } from '../../class/portfolio/price-service';
import { getPreferredCurrency as getPreferredCurrencyFunc } from '../../blue_modules/currency';
import { FiatUnit } from '../../models/fiatUnit';
import loc from '../../loc';
import presentAlert from '../../components/Alert';

const Portfolio: React.FC = () => {
  const { wallets, saveToDisk } = useStorage();
  const { preferredFiatCurrency } = useSettings();
  const { colors } = useTheme();
  const { setOptions } = useExtendedNavigation();
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [metrics, setMetrics] = useState<PortfolioMetricsType | null>(null);
  const [feesData, setFeesData] = useState<FeesData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currency, setCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const hasLoadedOnce = useRef(false);

  // Load preferred currency
  useEffect(() => {
    const loadCurrency = async () => {
      const preferred = await getPreferredCurrencyFunc();
      setCurrency(preferred.endPointKey);
      // Get currency symbol from FiatUnit
      const fiatUnit = FiatUnit[preferred.endPointKey];
      if (fiatUnit && fiatUnit.symbol) {
        setCurrencySymbol(fiatUnit.symbol);
      } else {
        setCurrencySymbol('$'); // Fallback
      }
    };
    loadCurrency();
  }, [preferredFiatCurrency]);

  // Track UTXOs when screen is focused (only once per focus)
  const saveToDiskRef = useRef(saveToDisk);
  useEffect(() => {
    saveToDiskRef.current = saveToDisk;
  }, [saveToDisk]);

  useFocusEffect(
    useCallback(() => {
      UtxoTracker.trackAllWallets(walletsRef.current);
      saveToDiskRef.current();
    }, []), // Empty deps - use refs for current values
  );

  // Track loading state to prevent duplicate calls
  const isLoadingRef = useRef(false);
  const lastCurrencyRef = useRef<string>(currency);
  const lastWalletsLengthRef = useRef<number>(wallets.length);
  const lastTimeRangeRef = useRef<TimeRange>(timeRange);
  const hasInitializedRefs = useRef(false);

  // Store current values in refs so the callback doesn't need to be recreated
  const walletsRef = useRef(wallets);
  const currencyRef = useRef(currency);
  const timeRangeRef = useRef(timeRange);
  
  // Update refs when values change
  // Use a more stable comparison to avoid unnecessary updates
  const prevWalletsLengthRef = useRef(wallets.length);
  useEffect(() => {
    if (wallets.length !== prevWalletsLengthRef.current || wallets !== walletsRef.current) {
      walletsRef.current = wallets;
      prevWalletsLengthRef.current = wallets.length;
    }
  }, [wallets]);
  
  useEffect(() => {
    currencyRef.current = currency;
  }, [currency]);
  
  useEffect(() => {
    timeRangeRef.current = timeRange;
  }, [timeRange]);

  // Load portfolio data - use refs to avoid dependency issues
  const loadPortfolioData = useCallback(
    async (showLoading = false, updateChartOnly = false) => {
      // Prevent duplicate calls
      if (isLoadingRef.current) {
        console.log('Portfolio: Already loading, skipping duplicate call');
        return;
      }

      const currentCurrency = currencyRef.current;
      const currentWallets = walletsRef.current;
      const currentTimeRange = timeRangeRef.current;

      console.log('Portfolio: loadPortfolioData called', { currency: currentCurrency, walletsLength: currentWallets.length, showLoading, updateChartOnly });
      
      if (!currentCurrency || currentWallets.length === 0) {
        console.log('Portfolio: Skipping load - no currency or wallets', { currency: currentCurrency, walletsLength: currentWallets.length });
        setIsInitialLoading(false);
        return;
      }

      isLoadingRef.current = true;

      try {
        if (showLoading && !hasLoadedOnce.current) {
          setIsInitialLoading(true);
        }

        if (!updateChartOnly) {
          console.log('Portfolio: Tracking UTXOs...');
          // Track UTXOs first
          try {
            UtxoTracker.trackAllWallets(currentWallets);
            console.log('Portfolio: UTXOs tracked');
          } catch (utxoError) {
            console.error('Portfolio: Error tracking UTXOs:', utxoError);
            // Continue anyway - we can still calculate with existing timestamps
          }

          console.log('Portfolio: Calculating metrics...');
          // Calculate metrics
          const portfolioMetrics = await PortfolioCalculator.getMetrics(currentWallets, currentCurrency);
          setMetrics(portfolioMetrics);
          console.log('Portfolio: Metrics calculated', portfolioMetrics);

          console.log('Portfolio: Calculating fees...');
          // Calculate fees
          const fees = await PortfolioCalculator.getFeesData(currentWallets, currentCurrency);
          setFeesData(fees);
          console.log('Portfolio: Fees calculated', fees);
        }

        console.log('Portfolio: Getting chart history...');
        // Get chart data
        const history = await PortfolioCalculator.getPortfolioHistory(currentWallets, currentTimeRange, currentCurrency);
        setChartData(history);
        console.log('Portfolio: Chart history loaded', history.length, 'data points');

        hasLoadedOnce.current = true;
      } catch (error) {
        console.error('Portfolio: Error loading portfolio data:', error);
        console.error('Portfolio: Error stack:', error instanceof Error ? error.stack : 'No stack');
        // Still set loading to false so UI can render
      } finally {
        // Always clear loading state, even if there was an error
        setIsInitialLoading(false);
        setIsRefreshing(false);
        isLoadingRef.current = false;
      }
    },
    [], // Empty deps - uses refs instead
  );

  // Single effect to handle initial load and updates
  useEffect(() => {
    // Initialize refs on first run
    if (!hasInitializedRefs.current) {
      lastCurrencyRef.current = currency;
      lastWalletsLengthRef.current = wallets.length;
      lastTimeRangeRef.current = timeRange;
      hasInitializedRefs.current = true;
    }

    const currencyChanged = lastCurrencyRef.current !== currency;
    const walletsChanged = lastWalletsLengthRef.current !== wallets.length;
    const timeRangeChanged = lastTimeRangeRef.current !== timeRange;
    const needsInitialLoad = !hasLoadedOnce.current;

    console.log('Portfolio: Effect triggered', {
      currencyChanged,
      walletsChanged,
      timeRangeChanged,
      needsInitialLoad,
      currency,
      walletsLength: wallets.length,
      timeRange,
      lastCurrency: lastCurrencyRef.current,
      lastWalletsLength: lastWalletsLengthRef.current,
      lastTimeRange: lastTimeRangeRef.current,
    });

    // Skip if nothing changed and we've already loaded
    if (!needsInitialLoad && !currencyChanged && !walletsChanged && !timeRangeChanged) {
      console.log('Portfolio: No changes detected, skipping load');
      return;
    }

    if (!currency || wallets.length === 0) {
      console.log('Portfolio: No currency or wallets, skipping load');
      setIsInitialLoading(false);
      return;
    }

    // Update refs before loading to prevent duplicate triggers
    if (currencyChanged) lastCurrencyRef.current = currency;
    if (walletsChanged) lastWalletsLengthRef.current = wallets.length;
    if (timeRangeChanged) lastTimeRangeRef.current = timeRange;

    // Initial load - show loading indicator
    if (needsInitialLoad) {
      console.log('Portfolio: Performing initial load');
      loadPortfolioData(true, false);
    } else if (timeRangeChanged) {
      // Only time range changed - update chart only
      console.log('Portfolio: Time range changed, updating chart only');
      loadPortfolioData(false, true);
    } else {
      // Currency or wallets changed - reload everything
      console.log('Portfolio: Currency or wallets changed, reloading all data');
      loadPortfolioData(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, wallets.length, timeRange]); // Removed loadPortfolioData from deps to prevent loops

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPortfolioData(false);
  }, [loadPortfolioData]);

  // Handle time range change
  const handleTimeRangeChange = useCallback(
    (newRange: TimeRange) => {
      // Just update the state, the useEffect will handle loading the chart
      setTimeRange(newRange);
    },
    [],
  );

  // Handle cache repair/clear
  const handleRepairCache = useCallback(async () => {
    presentAlert({
      title: loc.portfolio.repair_cache_title || 'Repair Price Cache',
      message: loc.portfolio.repair_cache_message || 'This will scan and remove corrupted price cache entries. Continue?',
      buttons: [
        {
          text: loc._.ok || 'OK',
          onPress: async () => {
            try {
              const removed = await PriceService.repairCache();
              presentAlert({
                title: loc.portfolio.repair_cache_complete || 'Cache Repair Complete',
                message: loc.formatString(loc.portfolio.repair_cache_result || 'Removed {count} corrupted entries.', { count: removed.toString() }),
              });
              // Reload data after repair
              await loadPortfolioData(false);
            } catch (error) {
              presentAlert({
                title: loc.portfolio.repair_cache_error || 'Error',
                message: error instanceof Error ? error.message : 'Failed to repair cache',
              });
            }
          },
          style: 'default',
        },
        {
          text: loc._.cancel || 'Cancel',
          style: 'cancel',
        },
      ],
    });
  }, [loadPortfolioData]);

  const handleClearCache = useCallback(async () => {
    presentAlert({
      title: loc.portfolio.clear_cache_title || 'Clear Price Cache',
      message: loc.portfolio.clear_cache_message || 'This will clear all cached prices. Prices will be re-fetched from the API. Continue?',
      buttons: [
        {
          text: loc.portfolio.clear_cache_confirm || 'Clear All',
          onPress: async () => {
            try {
              await PriceService.clearAllCache();
              presentAlert({
                title: loc.portfolio.clear_cache_complete || 'Cache Cleared',
                message: loc.portfolio.clear_cache_complete_message || 'All cached prices have been cleared.',
              });
              // Reload data after clearing
              await loadPortfolioData(false);
            } catch (error) {
              presentAlert({
                title: loc.portfolio.clear_cache_error || 'Error',
                message: error instanceof Error ? error.message : 'Failed to clear cache',
              });
            }
          },
          style: 'destructive',
        },
        {
          text: loc._.cancel || 'Cancel',
          style: 'cancel',
        },
      ],
    });
  }, [loadPortfolioData]);

  // Header right button for cache management
  const HeaderRight = useMemo(
    () => (
      <TouchableOpacity
        onPress={handleRepairCache}
        style={{ paddingHorizontal: 16 }}
        accessibilityLabel={loc.portfolio.repair_cache || 'Repair Cache'}
      >
        <Text style={{ color: colors.brandingColor, fontSize: 16 }}>🔧</Text>
      </TouchableOpacity>
    ),
    [handleRepairCache, colors.brandingColor],
  );

  // Set header options
  useEffect(() => {
    setOptions({
      headerRight: () => HeaderRight,
    });
  }, [HeaderRight, setOptions]);


  // Debug logging - removed to prevent re-render loops
  // useEffect(() => {
  //   console.log('Portfolio: Render state', {
  //     isInitialLoading,
  //     hasLoadedOnce: hasLoadedOnce.current,
  //     walletsLength: wallets.length,
  //     currency,
  //     metrics: metrics ? 'present' : 'null',
  //     feesData: feesData ? 'present' : 'null',
  //     chartDataLength: chartData.length,
  //   });
  // }, [isInitialLoading, wallets.length, currency, metrics, feesData, chartData.length]);

  // Show loading only on initial load
  if (isInitialLoading && !hasLoadedOnce.current) {
    console.log('Portfolio: Showing loading state');
    return (
      <SafeAreaScrollView>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.brandingColor} />
          <Text style={[styles.loadingText, { color: colors.foregroundColor }]}>Loading portfolio...</Text>
        </View>
      </SafeAreaScrollView>
    );
  }

  // Show empty state if no wallets
  if (wallets.length === 0) {
    console.log('Portfolio: Showing empty state - no wallets');
    return (
      <SafeAreaScrollView>
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyText, { color: colors.foregroundColor }]}>
            {loc.portfolio.no_wallets_found || 'No on-chain wallets found. Add a Bitcoin wallet to see your portfolio.'}
          </Text>
        </View>
      </SafeAreaScrollView>
    );
  }

  console.log('Portfolio: Rendering main view');

  // Always render the main view if we have wallets, even if data is still loading
  return (
    <SafeAreaScrollView
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.brandingColor} />}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Total Balance */}
        <PortfolioTotalBalance currency={currency} currencySymbol={currencySymbol} isLoading={isInitialLoading && !metrics} />

        {/* Chart */}
        <PortfolioChart data={chartData} timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange} currencySymbol={currencySymbol} />

        {/* Metrics - only show loading on initial load */}
        <PortfolioMetrics metrics={metrics} currency={currency} isLoading={isInitialLoading && !metrics} />

        {/* Fees Display - only show loading on initial load */}
        <FeesDisplay feesData={feesData} currency={currency} isLoading={isInitialLoading && !feesData} />
      </View>
    </SafeAreaScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    gap: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 400,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
});

export default Portfolio;

