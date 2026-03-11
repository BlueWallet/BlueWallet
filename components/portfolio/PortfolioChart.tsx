import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, LayoutChangeEvent } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../themes';
import { ChartDataPoint, TimeRange } from '../../class/portfolio/portfolio-calculator';
import dayjs from 'dayjs';

interface PortfolioChartProps {
  data: ChartDataPoint[];
  timeRange: TimeRange;
  /** The time range the current `data` is for. When this differs from `timeRange`, data is still loading for the selected range – don't animate. */
  dataTimeRange?: TimeRange | null;
  onTimeRangeChange: (range: TimeRange) => void;
  currencySymbol: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 250;
const LEFT_Y_AXIS_WIDTH = 0; // Width reserved for left Y-axis labels
const RIGHT_Y_AXIS_WIDTH = 0; // Width reserved for right Y-axis labels
const CHART_CONTAINER_MARGIN = 32; // marginHorizontal 16 each side
// Content area between the two Y-axes: no overflow into axis or padding
const CONTENT_WIDTH = SCREEN_WIDTH - CHART_CONTAINER_MARGIN - LEFT_Y_AXIS_WIDTH - RIGHT_Y_AXIS_WIDTH;

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

// Tooltip shown when user taps a bar: time + BTC + local currency
const ChartTooltip: React.FC<{
  dateLabel: string;
  btcValue: number;
  currencyValue: number;
  currencySymbol: string;
  colors: { background: string; foregroundColor: string; alternativeTextColor: string };
}> = ({ dateLabel, btcValue, currencyValue, currencySymbol, colors }) => {
  const formattedCurrency =
    currencyValue != null && !isNaN(currencyValue)
      ? `${currencySymbol}${currencyValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : '—';
  const formattedBtc = btcValue >= 0.00001 ? btcValue.toFixed(8) : btcValue.toFixed(4);
  return (
    <View style={[styles.tooltipContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.tooltipDate, { color: colors.foregroundColor }]}>{dateLabel}</Text>
      <Text style={[styles.tooltipBtc, { color: colors.alternativeTextColor }]}>{formattedBtc} BTC</Text>
      <Text style={[styles.tooltipCurrency, { color: colors.foregroundColor }]}>{formattedCurrency}</Text>
    </View>
  );
};

const TOOLTIP_WIDTH = 120;

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data, timeRange, dataTimeRange = null, onTimeRangeChange, currencySymbol }) => {
  const { colors } = useTheme();
  const [contentWidth, setContentWidth] = useState(0);
  const [pointerX, setPointerX] = useState<number | null>(null);
  const [pointerIndex, setPointerIndex] = useState<number | null>(null);
  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContentWidth(w);
  }, []);

  // Use measured content width so chart fills actual space; fallback to constant for first paint
  const chartWidth = contentWidth > 0 ? contentWidth : CONTENT_WIDTH;

  // Only animate when the displayed data matches the selected time range (avoids animating with stale data)
  const shouldAnimate = dataTimeRange !== null && dataTimeRange === timeRange;
  const displayRange = dataTimeRange ?? timeRange;

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

  // Calculate bar width and spacing to fill the entire content width with 0 padding
  const getBarDimensions = (
    range: TimeRange,
    barCount: number,
    availableWidth: number = chartWidth
  ): { barWidth: number; spacing: number; initialSpacing: number; endSpacing: number } => {
    const GAP_WIDTH = 2; // Fixed 2px gap between bars
    const n = Math.max(barCount, 1);
    const totalGaps = (n - 1) * GAP_WIDTH;

    // Bar width so that n * barWidth + totalGaps = availableWidth (exact fill, 0 padding)
    const barWidth = Math.max(8, (availableWidth - totalGaps) / n);

    return {
      barWidth,
      spacing: GAP_WIDTH,
      initialSpacing: 0,
      endSpacing: 0,
    };
  };

  // Prepare data for charts
  const chartData = useMemo(() => {
    console.log('PortfolioChart: useMemo triggered - displayRange:', displayRange, 'data length:', data?.length);
    console.log('PortfolioChart: ========== CHART DATA PROCESSING START ==========');
    console.log('PortfolioChart: Received data:', data?.length, 'points');
    console.log('PortfolioChart: Display range (data range):', displayRange);
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
      return { barData: [], lineData: [], realCurrencyValues: [], maxBtc: 0, maxCurrency: 0, minCurrency: 0, maxCurrencyWithPadding: 0, niceMaxBtc: 0, chartMaxBtc: 0, chartMinBtc: 0 };
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
      return { barData: [], lineData: [], realCurrencyValues: [], maxBtc: 0, maxCurrency: 0, minCurrency: 0, maxCurrencyWithPadding: 0, niceMaxBtc: 0, chartMaxBtc: 0, chartMinBtc: 0 };
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
        barColor = '#80CCEC'; // Fallback
      }
      const isDimmed = pointerIndex != null && index !== pointerIndex;
      const hexBase = barColor.length >= 7 ? barColor.slice(0, 7) : barColor;
      const dimmedColor = hexBase + '40'; // ~25% opacity
      const frontColor = isDimmed ? dimmedColor : barColor;
      const gradientColor = isDimmed ? dimmedColor : barColor;

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
        label: index % labelFrequency === 0 ? formatDateLabel(point.date, displayRange) : '',
        frontColor: frontColor,
        gradientColor: gradientColor,
        topLabelComponent: () => null, // Hide top labels for cleaner look
        borderRadius: 6, // Per-bar radius (doc: barDataItem.borderRadius); keep small so bars don't look pill-shaped
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

    // Prepare line chart data: use normalized values (0–1) so pointer and line share the same Y scale.
    // The library's pointer position uses a 0-based scale; with a custom mostNegativeValue the line
    // was drawn with min–max range but the pointer could mismatch. Normalizing fixes alignment.
    const lineRange = maxCurrencyWithPadding - minCurrencyWithPadding;
    const lineData = validData.map((point) => {
      const safeValue = isNaN(point.localCurrencyValue) || !isFinite(point.localCurrencyValue) || point.localCurrencyValue < 0
        ? 0
        : point.localCurrencyValue;
      const normalizedValue =
        lineRange > 0
          ? Math.max(0, Math.min(1, (safeValue - minCurrencyWithPadding) / lineRange))
          : 0;
      return {
        value: normalizedValue,
        label: '',
      };
    });
    const realCurrencyValues = validData.map(
      d => (isNaN(d.localCurrencyValue) || !isFinite(d.localCurrencyValue) || d.localCurrencyValue < 0 ? 0 : d.localCurrencyValue),
    );

    return {
      barData,
      lineData,
      realCurrencyValues,
      maxBtc,
      minBtc: minBtcWithPadding,
      maxCurrency,
      minCurrency: minCurrencyWithPadding,
      maxCurrencyWithPadding,
      niceMaxBtc,
      chartMaxBtc,
      chartMinBtc,
    };
  }, [data, colors, displayRange, pointerIndex]);

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
              color={colors.foregroundColor || '#111827'}
            />
            {/* Content area: measured so bar/line use full available width */}
            <View style={styles.chartContentArea} onLayout={onContentLayout}>
              {(() => {
                const dimensions = getBarDimensions(displayRange, chartData.barData.length);
                return (
                  <>
                    <BarChart
                      key={`bar-chart-${displayRange}-${chartData.barData.length}`}
                      data={chartData.barData}
                      width={chartWidth}
                      parentWidth={chartWidth}
                      adjustToWidth
                      height={CHART_HEIGHT}
                      barWidth={dimensions.barWidth}
                      spacing={dimensions.spacing}
                      barBorderRadius={6}
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
                      isAnimated={shouldAnimate}
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
                    <View style={styles.lineChartOverlay} pointerEvents="auto">
                      <LineChart
                        data={chartData.lineData}
                        width={chartWidth}
                        height={CHART_HEIGHT}
                        color={colors.foregroundColor || '#111827'}
                        thickness={2}
                        curved={true}
                        hideRules={true}
                        hideYAxisText={true}
                        xAxisLabelTextStyle={{ color: 'transparent', fontSize: 0 }}
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisColor="transparent"
                        hideDataPoints={false}
                        dataPointsColor={colors.foregroundColor || '#111827'}
                        dataPointsRadius={3}
                        noOfSections={4}
                        maxValue={1}
                        mostNegativeValue={0}
                        isAnimated={shouldAnimate}
                        animationDuration={1000}
                        animateOnDataChange={shouldAnimate}
                        onDataChangeAnimationDuration={800}
                        backgroundColor="transparent"
                        initialSpacing={dimensions.initialSpacing}
                        endSpacing={dimensions.endSpacing}
                        adjustToWidth
                        areaChart={false}
                        disableScroll={chartData.lineData.length <= 15}
                        scrollToEnd={chartData.lineData.length > 15}
                        scrollAnimation={chartData.lineData.length > 15}
                        getPointerProps={(props: { pointerIndex: number; pointerX: number; pointerY: number }) => {
                          const active = props.pointerIndex >= 0;
                          setPointerX(active ? props.pointerX : null);
                          setPointerIndex(active ? props.pointerIndex : null);
                        }}
                        pointerConfig={{
                          pointerEvents: 'auto',
                          showPointerStrip: true,
                          onPointerLeave: () => {
                            setPointerX(null);
                            setPointerIndex(null);
                          },
                          resetPointerIndexOnRelease: true,
                          pointerColor: colors.success || '#60A5FA',
                          pointerStripColor: colors.success || '#60A5FA',
                          pointerStripWidth: 1,
                          activatePointersOnLongPress: chartData.lineData.length > 15,
                          activatePointersInstantlyOnTouch: chartData.lineData.length <= 15,
                          autoAdjustPointerLabelPosition: true,
                          pointerLabelWidth: TOOLTIP_WIDTH,
                          pointerLabelHeight: 70,
                          shiftPointerLabelY: -80,
                          shiftPointerLabelX:
                            pointerX != null && chartWidth > 0
                              ? Math.min(0, chartWidth - pointerX - TOOLTIP_WIDTH - 30)
                              : 0,
                          pointerLabelComponent: (items: Array<{ value?: number }>, _secondaryDataItem: unknown, pointerIndex: number) => {
                            const point = data[pointerIndex];
                            const dateLabel = point ? dayjs(point.date).format('MMM D, YYYY') : '';
                            const btcVal = chartData.barData[pointerIndex]?.value ?? 0;
                            const currencyVal = chartData.realCurrencyValues[pointerIndex] ?? 0;
                            return (
                              <ChartTooltip
                                dateLabel={dateLabel}
                                btcValue={btcVal}
                                currencyValue={currencyVal}
                                currencySymbol={currencySymbol}
                                colors={{
                                  background: colors.background || '#FFFFFF',
                                  foregroundColor: colors.foregroundColor || '#111827',
                                  alternativeTextColor: colors.alternativeTextColor || '#6B7280',
                                }}
                              />
                            );
                          },
                        }}
                      />
                    </View>
                  </>
                );
              })()}
            </View>
            {/* Custom Right Y-Axis for Line Chart */}
            <RightYAxis
              maxValue={(chartData.maxCurrencyWithPadding ?? 0) > 0 ? (chartData.maxCurrencyWithPadding ?? 0) : 1}
              minValue={chartData.minCurrency ?? 0}
              height={CHART_HEIGHT}
              noOfSections={4}
              color={colors.foregroundColor || '#111827'}
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
    paddingBottom: 20,
    marginHorizontal: 16,
    position: 'relative',
    overflow: 'visible',
    minHeight: CHART_HEIGHT + 40,
  },
  chartContentArea: {
    position: 'absolute',
    top: 20,
    left: LEFT_Y_AXIS_WIDTH,
    right: RIGHT_Y_AXIS_WIDTH,
    bottom: 20,
    overflow: 'visible',
  },
  chartWrapper: {
    position: 'relative',
  },
  lineChartOverlay: {
    position: 'absolute',
    top: 0,
    left: -10,
    right: 0,
    bottom: 0,
    overflow: 'visible',
  },
      leftYAxisContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        width: 0,
        height: CHART_HEIGHT,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        paddingLeft: 0,
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
  tooltipContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 100,
    maxWidth: 120,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 9999,
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipBtc: {
    fontSize: 11,
    marginBottom: 1,
  },
  tooltipCurrency: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyChartContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default PortfolioChart;
