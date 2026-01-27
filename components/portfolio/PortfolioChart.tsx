import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../themes';
import { ChartDataPoint, TimeRange } from '../../class/portfolio/portfolio-calculator';
import dayjs from 'dayjs';

interface PortfolioChartProps {
  data: ChartDataPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  currencySymbol: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64; // Account for padding (16 on each side + 16 for chart padding)
const CHART_HEIGHT = 250;
const LEFT_Y_AXIS_WIDTH = 50; // Width reserved for left Y-axis labels
const RIGHT_Y_AXIS_WIDTH = 60; // Width reserved for right Y-axis labels

// Format date label based on time range
const formatDateLabel = (dateStr: string, timeRange: TimeRange): string => {
  const date = dayjs(dateStr);
  
  switch (timeRange) {
    case '1W':
      return date.format('ddd');
    case '1M':
      return date.format('MMM D');
    case '6M':
      return date.format('MMM');
    case '1Y':
      return date.format('MMM YY');
    case '5Y':
    case 'All':
      return date.format('YYYY');
    default:
      return date.format('MMM D');
  }
};

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data, timeRange, onTimeRangeChange, currencySymbol }) => {
  const { colors } = useTheme();

  // Calculate expected number of bars for fixed time ranges
  const getExpectedBarCount = (range: TimeRange): number | null => {
    switch (range) {
      case '1W':
        return 7; // 7 days
      case '1M':
        return 5; // ~5 weeks in a month
      case '6M':
        return 6; // 6 months
      case '1Y':
        return 12; // 12 months
      case '5Y':
        return 5; // 5 years
      case 'All':
        return null; // Variable, depends on UTXO dates
      default:
        return null;
    }
  };

  // Calculate bar width and spacing based on time range
  const getBarDimensions = (
    range: TimeRange, 
    barCount: number
  ): { barWidth: number; spacing: number; initialSpacing: number; endSpacing: number } => {
    const MAX_BAR_WIDTH = 32; // Maximum bar width in pixels
    const GAP_WIDTH = 2; // Fixed 2px gap between bars
    const availableWidth = CHART_WIDTH;
    
    const expectedCount = getExpectedBarCount(range);
    const actualBarCount = barCount;
    
    // For "All" or if we don't have expected count, use dynamic calculation
    if (range === 'All' || expectedCount === null) {
      // Calculate bar width with max constraint
      const totalGaps = (actualBarCount - 1) * GAP_WIDTH;
      const maxBarWidth = Math.min(MAX_BAR_WIDTH, (availableWidth - totalGaps) / Math.max(actualBarCount, 1));
      const barWidth = Math.max(12, maxBarWidth);
      
      // Calculate total width needed
      const totalBarsWidth = barWidth * actualBarCount;
      const totalWidth = totalBarsWidth + totalGaps;
      
      // Center the bars if they don't fill the entire width
      const remainingSpace = availableWidth - totalWidth;
      const initialSpacing = Math.max(10, remainingSpace / 2);
      const endSpacing = Math.max(0, remainingSpace / 2);
      
      return {
        barWidth,
        spacing: GAP_WIDTH,
        initialSpacing,
        endSpacing,
      };
    }
    
    // For fixed ranges, calculate to fill entire width with 2px gaps, but cap at 16px
    const totalGaps = (expectedCount - 1) * GAP_WIDTH;
    const maxBarWidth = Math.min(MAX_BAR_WIDTH, (availableWidth - totalGaps) / expectedCount);
    const barWidth = Math.max(12, maxBarWidth);
    
    // Calculate total width needed
    const totalBarsWidth = barWidth * expectedCount;
    const totalWidth = totalBarsWidth + totalGaps;
    
    // Center the bars if they don't fill the entire width
    const remainingSpace = availableWidth - totalWidth;
    const initialSpacing = Math.max(10, remainingSpace / 2);
    const endSpacing = Math.max(0, remainingSpace / 2);
    
    return {
      barWidth,
      spacing: GAP_WIDTH,
      initialSpacing,
      endSpacing,
    };
  };

  // Prepare data for charts
  const chartData = useMemo(() => {
    console.log('PortfolioChart: useMemo triggered - timeRange:', timeRange, 'data length:', data?.length);
    console.log('PortfolioChart: ========== CHART DATA PROCESSING START ==========');
    console.log('PortfolioChart: Received data:', data?.length, 'points');
    console.log('PortfolioChart: Time range:', timeRange);
    if (data && data.length > 0) {
      console.log('PortfolioChart: First data point:', {
        date: data[0].date,
        btcAmount: data[0].btcAmount,
        btcAmountBTC: (data[0].btcAmount / 100000000).toFixed(8),
        localCurrencyValue: data[0].localCurrencyValue
      });
      console.log('PortfolioChart: Last data point:', {
        date: data[data.length - 1].date,
        btcAmount: data[data.length - 1].btcAmount,
        btcAmountBTC: (data[data.length - 1].btcAmount / 100000000).toFixed(8),
        localCurrencyValue: data[data.length - 1].localCurrencyValue
      });
      
      // Calculate min/max BTC values
      const btcAmounts = data.map(d => d.btcAmount / 100000000);
      const minBtc = Math.min(...btcAmounts);
      const maxBtc = Math.max(...btcAmounts);
      console.log('PortfolioChart: BTC range:', {
        min: minBtc.toFixed(8),
        max: maxBtc.toFixed(8),
        range: (maxBtc - minBtc).toFixed(8)
      });
    }
    
    if (!data || data.length === 0) {
      console.log('PortfolioChart: No data provided');
      return { barData: [], lineData: [], maxBtc: 0, maxCurrency: 0, minCurrency: 0, maxCurrencyWithPadding: 0, niceMaxBtc: 0, chartMaxBtc: 0, chartMinBtc: 0 };
    }

    // Filter out invalid data points
    const validData = data.filter(
      d => 
        d && 
        typeof d.btcAmount === 'number' && 
        !isNaN(d.btcAmount) && 
        isFinite(d.btcAmount) &&
        d.btcAmount >= 0 &&
        typeof d.localCurrencyValue === 'number' && 
        !isNaN(d.localCurrencyValue) && 
        isFinite(d.localCurrencyValue) &&
        d.localCurrencyValue >= 0
    );

    if (validData.length === 0) {
      return { barData: [], lineData: [], maxBtc: 0, maxCurrency: 0, minCurrency: 0, maxCurrencyWithPadding: 0, niceMaxBtc: 0, chartMaxBtc: 0, chartMinBtc: 0 };
    }

    // Find min and max values for scaling - ensure they're valid numbers
    const btcValues = validData.map(d => d.btcAmount / 100000000).filter(v => v > 0);
    const currencyValues = validData.map(d => d.localCurrencyValue).filter(v => v > 0);
    
    const minBtc = btcValues.length > 0 ? Math.min(...btcValues) : 0;
    const maxBtc = btcValues.length > 0 ? Math.max(...btcValues) : 0.001; // Minimum 0.001 BTC
    const minCurrency = currencyValues.length > 0 ? Math.min(...currencyValues) : 0;
    const maxCurrency = currencyValues.length > 0 ? Math.max(...currencyValues) : 1; // Minimum $1
    
    // Calculate range for better visualization (use data range instead of always starting from 0)
    const btcRange = maxBtc - minBtc;
    const currencyRange = maxCurrency - minCurrency;
    
    // Add small padding (5% of range) to min/max for better visualization
    // Handle edge case where range is 0 or very small
    const btcPadding = btcRange > 0 ? btcRange * 0.05 : maxBtc * 0.05;
    const currencyPadding = currencyRange > 0 ? currencyRange * 0.05 : maxCurrency * 0.05;
    
    // For bar charts, if min is close to 0 or the range is large, start from 0 for better visualization
    // Otherwise, use the data range with padding
    const shouldStartFromZero = minBtc < maxBtc * 0.1; // If min is less than 10% of max, start from 0
    const minBtcWithPadding = shouldStartFromZero ? 0 : Math.max(0, minBtc - btcPadding);
    const maxBtcWithPadding = maxBtc + btcPadding;
    const minCurrencyWithPadding = Math.max(0, minCurrency - currencyPadding);
    const maxCurrencyWithPadding = maxCurrency + currencyPadding;
    
    console.log('PortfolioChart: BTC range calculation:', {
      minBtc: minBtc.toFixed(8),
      maxBtc: maxBtc.toFixed(8),
      btcRange: btcRange.toFixed(8),
      shouldStartFromZero,
      minBtcWithPadding: minBtcWithPadding.toFixed(8),
      maxBtcWithPadding: maxBtcWithPadding.toFixed(8),
    });
    
    // Calculate nice rounded Y-axis values for better readability (for Y-axis labels only)
    const getNiceMaxValue = (max: number): number => {
      if (max <= 0) return 1;
      const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
      const normalized = max / magnitude;
      let niceValue;
      if (normalized <= 1) niceValue = 1;
      else if (normalized <= 2) niceValue = 2;
      else if (normalized <= 5) niceValue = 5;
      else niceValue = 10;
      return niceValue * magnitude;
    };
    
    const niceMaxBtc = getNiceMaxValue(maxBtc);
    
    // For bar scaling, use range-based max with padding
    const chartMaxBtc = maxBtcWithPadding;
    const chartMinBtc = minBtcWithPadding;

    console.log('PortfolioChart: Valid data points:', validData.length);
    console.log('PortfolioChart: Max BTC:', maxBtc, 'Max Currency:', maxCurrency);
    console.log('PortfolioChart: Sample BTC values:', btcValues.slice(0, 3));
    console.log('PortfolioChart: Sample currency values:', currencyValues.slice(0, 3));

    // Calculate label frequency based on data length
    const labelFrequency = Math.max(1, Math.floor(validData.length / 6));

    // Prepare bar chart data (Bitcoin amounts) with highlighted latest bar
    // Inspired by modern financial app design: most bars are faded, latest is highlighted
    const barData = validData.map((point, index) => {
      const btcValue = point.btcAmount / 100000000;
      // Ensure value is valid
      const safeBtcValue = isNaN(btcValue) || !isFinite(btcValue) || btcValue < 0 ? 0 : btcValue;
      
      // All bars use the same purple color
      // Ensure brandingColor is valid (not white/transparent/undefined)
      let barColor = colors.brandingColor;
      if (!barColor || barColor === '#ffffff' || barColor === '#FFFFFF' || barColor === 'white' || barColor === 'transparent') {
        barColor = '#8B5CF6'; // Fallback to purple/violet
      }
      
      // All bars use the same color
      const frontColor = barColor;
      const gradientColor = barColor;
      
      // Debug: Log color assignment for verification
      if (index === 0 || index === validData.length - 1) {
        console.log(`PortfolioChart: Bar ${index} color:`, {
          index,
          lastIndex: validData.length - 1,
          frontColor,
          barColor,
          colorsBrandingColor: colors.brandingColor
        });
      }
      
      const barItem = {
        value: safeBtcValue,
        label: index % labelFrequency === 0 ? formatDateLabel(point.date, timeRange) : '',
        frontColor: frontColor,
        gradientColor: gradientColor,
        topLabelComponent: () => null, // Hide top labels for cleaner look
        radius: 4, // Border radius for rounded corners
      };
      
      // Log first 3 bars and last 3 bars for debugging
      if (index < 3 || index >= validData.length - 3) {
        console.log(`PortfolioChart: Bar ${index}/${validData.length - 1}:`, {
          ...barItem,
          originalBtcValue: btcValue,
          safeBtcValue: safeBtcValue,
          date: point.date
        });
      }
      
      return barItem;
    });
    
    console.log('PortfolioChart: ========== BAR DATA SUMMARY ==========');
    console.log('PortfolioChart: Generated', barData.length, 'bars');
    if (barData.length > 0) {
      const barValues = barData.map(b => b.value);
      const minBarValue = Math.min(...barValues);
      const maxBarValue = Math.max(...barValues);
      console.log('PortfolioChart: First bar:', {
        value: barData[0].value,
        valueBTC: barData[0].value.toFixed(8),
        label: barData[0].label,
        frontColor: barData[0].frontColor
      });
      console.log('PortfolioChart: Last bar:', {
        value: barData[barData.length - 1].value,
        valueBTC: barData[barData.length - 1].value.toFixed(8),
        label: barData[barData.length - 1].label,
        frontColor: barData[barData.length - 1].frontColor,
        index: barData.length - 1
      });
      // Log all bars for debugging
      console.log('PortfolioChart: All bars:', barData.map((b, i) => ({
        index: i,
        value: b.value,
        label: b.label,
        frontColor: b.frontColor
      })));
      console.log('PortfolioChart: Bar value range:', {
        minBarValue: minBarValue.toFixed(8),
        maxBarValue: maxBarValue.toFixed(8),
        range: (maxBarValue - minBarValue).toFixed(8)
      });
      // Calculate expected bar heights for debugging
      const firstBarHeightPercent = barData[0]?.value && chartMaxBtc > chartMinBtc
        ? (((barData[0].value - chartMinBtc) / (chartMaxBtc - chartMinBtc)) * 100).toFixed(2)
        : 'N/A';
      const lastBarHeightPercent = barData[barData.length - 1]?.value && chartMaxBtc > chartMinBtc
        ? (((barData[barData.length - 1].value - chartMinBtc) / (chartMaxBtc - chartMinBtc)) * 100).toFixed(2)
        : 'N/A';
      
      console.log('PortfolioChart: Chart scaling:', {
        minBtc: minBtc.toFixed(8),
        maxBtc: maxBtc.toFixed(8),
        chartMinBtc: chartMinBtc.toFixed(8),
        chartMaxBtc: chartMaxBtc.toFixed(8),
        chartRange: (chartMaxBtc - chartMinBtc).toFixed(8),
        firstBarValue: barData[0]?.value?.toFixed(8),
        firstBarHeightPercent: firstBarHeightPercent + '%',
        lastBarValue: barData[barData.length - 1]?.value?.toFixed(8),
        lastBarHeightPercent: lastBarHeightPercent + '%',
      });
      console.log('PortfolioChart: Max BTC value for chart:', maxBtc.toFixed(8));
      console.log('PortfolioChart: Chart max BTC (with padding):', chartMaxBtc.toFixed(8));
      console.log('PortfolioChart: Nice max BTC value (for labels):', niceMaxBtc.toFixed(8));
    }
    console.log('PortfolioChart: ========== CHART DATA PROCESSING END ==========');

    // Prepare line chart data (Local currency value)
    // Don't include labels - BarChart will show them
    const lineData = validData.map((point) => {
      const safeValue = isNaN(point.localCurrencyValue) || !isFinite(point.localCurrencyValue) || point.localCurrencyValue < 0 
        ? 0 
        : point.localCurrencyValue;
      
      return {
        value: safeValue,
        label: '', // No labels for line chart - BarChart handles X-axis labels
      };
    });

        return { 
          barData, 
          lineData, 
          maxBtc, 
          minBtc: minBtcWithPadding,
          maxCurrency, 
          minCurrency: minCurrencyWithPadding,
          maxCurrencyWithPadding, // Include padded max for line chart
          niceMaxBtc: niceMaxBtc, 
          chartMaxBtc,
          chartMinBtc 
        };
  }, [data, colors, timeRange]);

  const timeRanges: TimeRange[] = ['1W', '1M', '6M', '1Y', '5Y', 'All'];

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.chartContainer, { backgroundColor: colors.background || '#FFFFFF' }]}>
          <View style={styles.emptyChartContainer}>
            <Text style={[styles.emptyText, { color: colors.alternativeTextColor }]}>
              No chart data available for this period.
            </Text>
          </View>
        </View>
        <View style={[styles.timeRangeContainer, { borderColor: colors.buttonDisabledBackgroundColor || '#E5E7EB' }]}>
          {timeRanges.map(range => (
            <TimeRangeButton
              key={range}
              range={range}
              isSelected={timeRange === range}
              onPress={() => onTimeRangeChange(range)}
              colors={colors}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Debug info - outside chart container */}
      {__DEV__ && (
        <View style={[styles.debugContainer, { backgroundColor: '#F3F4F6' }]}>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Bars: {chartData.barData.length} | Max: {chartData.maxBtc.toFixed(8)} BTC | 
            First: {chartData.barData[0]?.value?.toFixed(8)} | 
            Last: {chartData.barData[chartData.barData.length - 1]?.value?.toFixed(8)}
          </Text>
        </View>
      )}
      
      {/* Combined Chart Container */}
      <View style={[styles.chartContainer, { backgroundColor: colors.background || '#FFFFFF' }]}>
        {chartData.barData.length > 0 ? (
          <>
            {/* Left Y-Axis overlay for Bar Chart */}
            <LeftYAxis
              maxValue={(chartData.chartMaxBtc ?? 0) > 0 ? (chartData.chartMaxBtc ?? 0.001) : 0.001}
              minValue={chartData.chartMinBtc ?? 0}
              height={CHART_HEIGHT}
              noOfSections={4}
              color={colors.alternativeTextColor || '#9CA3AF'}
            />
            
            {/* Bar Chart (Bitcoin amounts) with secondary line for currency value */}
            {(() => {
              const dimensions = getBarDimensions(timeRange, chartData.barData.length);
              return (
                <BarChart
                  key={`bar-chart-${timeRange}-${chartData.barData.length}`}
                  data={chartData.barData}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  barWidth={dimensions.barWidth}
                  spacing={dimensions.spacing}
                  roundedTop
                  roundedBottom
                  barBorderRadius={4}
                  hideRules={false}
                  rulesType="solid"
                  rulesColor={colors.buttonDisabledBackgroundColor || '#E5E7EB'}
                  rulesThickness={0.5}
                  xAxisThickness={1}
                  yAxisThickness={0}
                  xAxisColor={colors.buttonDisabledBackgroundColor || '#E5E7EB'}
                  yAxisColor="transparent"
                  hideYAxisText={true}
                  xAxisLabelTextStyle={{ 
                    color: colors.alternativeTextColor || '#9CA3AF', 
                    fontSize: 10, 
                    fontWeight: '500',
                  }}
                  yAxisLabelPrefix=""
                  yAxisLabelSuffix=""
                  yAxisLabelWidth={0}
                  mostNegativeValue={chartData.chartMinBtc || 0}
                  yAxisOffset={0}
                  rotateLabel={false}
                  noOfSections={4}
                  maxValue={(chartData.chartMaxBtc ?? 0) > 0 ? (chartData.chartMaxBtc ?? 0.001) : 0.001}
                  isAnimated={true}
                  animationDuration={1200}
                  showGradient={false}
                  backgroundColor={colors.background || '#FFFFFF'}
                  showVerticalLines={false}
                  initialSpacing={dimensions.initialSpacing}
                  endSpacing={dimensions.endSpacing}
                  disableScroll={chartData.barData.length <= 10}
                  scrollToEnd={chartData.barData.length > 10}
                  scrollAnimation={chartData.barData.length > 10}
                />
              );
            })()}
            
            {/* Line Chart overlay (Local currency value) - positioned absolutely */}
            <View style={styles.lineChartOverlay} pointerEvents="none">
              {(() => {
                const dimensions = getBarDimensions(timeRange, chartData.barData.length);
                // Calculate the overlay offset to align with BarChart
                const overlayLeftOffset = LEFT_Y_AXIS_WIDTH + 20;
                // Use the same width as BarChart and shift it left to align
                return (
                  <View style={{ marginLeft: -overlayLeftOffset }}>
                    <LineChart
                      data={chartData.lineData}
                      width={CHART_WIDTH}
                      height={CHART_HEIGHT}
                      color={colors.success || '#34C759'}
                      thickness={2}
                      curved={true}
                      hideRules={true}
                      hideYAxisText={true}
                      xAxisLabelTextStyle={{ color: 'transparent', fontSize: 0 }}
                      xAxisThickness={0}
                      yAxisThickness={0}
                      yAxisColor="transparent"
                      hideDataPoints={false}
                      dataPointsColor={colors.success || '#34C759'}
                      dataPointsRadius={3}
                      noOfSections={4}
                      maxValue={(chartData.maxCurrencyWithPadding ?? 0) > 0 ? (chartData.maxCurrencyWithPadding ?? 0) : 1}
                      mostNegativeValue={chartData.minCurrency ?? 0}
                      isAnimated={true}
                      animationDuration={1000}
                      backgroundColor="transparent"
                      initialSpacing={dimensions.initialSpacing}
                      endSpacing={dimensions.endSpacing}
                      areaChart={false}
                      disableScroll={chartData.lineData.length <= 15}
                      scrollToEnd={chartData.lineData.length > 15}
                      scrollAnimation={chartData.lineData.length > 15}
                    />
                  </View>
                );
              })()}
            </View>
            
            {/* Custom Right Y-Axis for Line Chart */}
            <RightYAxis
              maxValue={(chartData.maxCurrencyWithPadding ?? 0) > 0 ? (chartData.maxCurrencyWithPadding ?? 0) : 1}
              minValue={chartData.minCurrency ?? 0}
              height={CHART_HEIGHT}
              noOfSections={4}
              color={colors.success || '#34C759'}
            />
          </>
        ) : (
          <View style={styles.emptyChartContainer}>
            <Text style={[styles.emptyText, { color: colors.alternativeTextColor }]}>
              No chart data available. Make sure you have on-chain wallets with transactions.
            </Text>
          </View>
        )}
      </View>

      {/* Time range filter buttons - moved to bottom */}
      <View style={[styles.timeRangeContainer, { borderColor: colors.buttonDisabledBackgroundColor || '#E5E7EB' }]}>
        {timeRanges.map(range => (
          <TimeRangeButton
            key={range}
            range={range}
            isSelected={timeRange === range}
            onPress={() => onTimeRangeChange(range)}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
};

// Custom Left Y-Axis Component
interface LeftYAxisProps {
  maxValue: number;
  minValue: number;
  height: number;
  noOfSections: number;
  color: string;
}

const LeftYAxis: React.FC<LeftYAxisProps> = ({ maxValue, minValue, height, noOfSections, color }) => {
  const formatLabel = (value: number): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue) || numValue <= 0) return '0';
    if (numValue < 0.01) {
      return numValue.toFixed(4);
    } else if (numValue < 1) {
      return numValue.toFixed(3);
    } else if (numValue < 10) {
      return numValue.toFixed(2);
    } else {
      return numValue.toFixed(1);
    }
  };

  const labels = [];
  const sectionHeight = height / noOfSections;
  const range = maxValue - minValue;
  
  for (let i = 0; i <= noOfSections; i++) {
    // Calculate value based on range (from min to max)
    const value = minValue + (range / noOfSections) * (noOfSections - i);
    const top = i * sectionHeight;
    labels.push(
      <Text
        key={i}
        style={[
          styles.leftYAxisLabel,
          {
            color: color,
            top: top - 8, // Center the label vertically
          },
        ]}
      >
        {formatLabel(value)}
      </Text>
    );
  }

  return (
    <View style={styles.leftYAxisContainer} pointerEvents="none">
      {labels}
    </View>
  );
};

// Custom Right Y-Axis Component
interface RightYAxisProps {
  maxValue: number;
  minValue: number;
  height: number;
  noOfSections: number;
  color: string;
}

const RightYAxis: React.FC<RightYAxisProps> = ({ maxValue, minValue, height, noOfSections, color }) => {
  const formatLabel = (value: number): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue) || numValue <= 0) return '0';
    if (numValue < 1000) {
      return numValue.toFixed(0);
    } else if (numValue < 1000000) {
      return (numValue / 1000).toFixed(1) + 'K';
    } else {
      return (numValue / 1000000).toFixed(1) + 'M';
    }
  };

  const labels = [];
  const sectionHeight = height / noOfSections;
  const range = Math.max(0, maxValue - minValue); // Ensure range is non-negative
  
  for (let i = 0; i <= noOfSections; i++) {
    // Calculate value based on range (from min to max)
    // When i=0: value = maxValue, when i=noOfSections: value = minValue
    const value = range > 0 
      ? minValue + (range / noOfSections) * (noOfSections - i)
      : maxValue; // If range is 0, all values are the same
    const top = i * sectionHeight;
    labels.push(
      <Text
        key={i}
        style={[
          styles.rightYAxisLabel,
          {
            color: color,
            top: top - 8, // Center the label vertically
          },
        ]}
      >
        {formatLabel(value)}
      </Text>
    );
  }

  return (
    <View style={styles.rightYAxisContainer} pointerEvents="none">
      {labels}
    </View>
  );
};

interface TimeRangeButtonProps {
  range: TimeRange;
  isSelected: boolean;
  onPress: () => void;
  colors: any;
}

const TimeRangeButton: React.FC<TimeRangeButtonProps> = ({ range, isSelected, onPress, colors }) => {
  return (
    <TouchableOpacity
      style={[
        styles.timeRangeButton,
        {
          backgroundColor: isSelected ? colors.buttonDisabledBackgroundColor || '#F3F4F6' : 'transparent',
          borderColor: 'transparent',
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.timeRangeButtonText,
          {
            color: isSelected ? colors.foregroundColor || '#111827' : colors.alternativeTextColor || '#9CA3AF',
            fontWeight: isSelected ? '600' : '400',
          },
        ]}
      >
        {range}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  debugContainer: {
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  timeRangeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    borderWidth: 0,
    marginHorizontal: 2,
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    paddingTop: 20,
    paddingBottom: 20, // Extra padding at bottom for X-axis labels
    paddingLeft: 10,
    paddingRight: 10, // Reduced right padding to minimize spacing
    marginHorizontal: 16,
    position: 'relative',
    overflow: 'visible', // Changed to visible so labels can render outside
   
  },
  chartWrapper: {
    position: 'relative',
  },
      lineChartOverlay: {
        position: 'absolute',
        top: 20,
        left: LEFT_Y_AXIS_WIDTH + 0,
        right: RIGHT_Y_AXIS_WIDTH + 0,
        bottom: 40,
        pointerEvents: 'none',
        overflow: 'hidden', // Prevent line chart from overflowing
      },
      leftYAxisContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        width: 50,
        height: CHART_HEIGHT,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        paddingLeft: 4,
        zIndex: 100,
      },
      leftYAxisLabel: {
        fontSize: 11,
        fontWeight: '500',
        position: 'absolute',
        textAlign: 'left',
        backgroundColor: 'transparent',
      },
      rightYAxisContainer: {
        position: 'absolute',
        top: 20,
        right: 0,
        width: RIGHT_Y_AXIS_WIDTH,
        height: CHART_HEIGHT,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingRight: 8,
        zIndex: 10,
      },
      rightYAxisLabel: {
        fontSize: 10,
        fontWeight: '500',
        position: 'absolute',
        textAlign: 'right',
      },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    padding: 20,
  },
  emptyChartContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default PortfolioChart;
