import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import { TWallet } from '../wallets/types';
import { UtxoTracker } from './utxo-tracker';
import { PriceService } from './price-service';
import { getPreferredCurrency } from '../../blue_modules/currency';
import { FiatUnitType } from '../../models/fiatUnit';
import { Chain } from '../../models/bitcoinUnits';

export type TimeRange = '1W' | '1M' | '6M' | '1Y' | '5Y' | 'All';

export interface PortfolioMetrics {
  totalBalance: number; // in sats
  currentValue: number; // in local currency
  costBasis: number; // in local currency
  averageBuyPrice: number; // in local currency per BTC
  unrealizedReturn: number; // in local currency
  unrealizedReturnPercent: number; // percentage
  feesSpent: number; // in sats
  feesSpentValue: number; // in local currency
  feesPercent: number; // percentage of total value
}

export interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  timestamp: number; // milliseconds
  btcAmount: number; // in sats
  localCurrencyValue: number; // in local currency
}

export interface FeesData {
  totalFeesSats: number;
  totalFeesValue: number; // in local currency
  feesPercent: number;
  isGood: boolean; // < 0.5% is good
}

/**
 * Calculates portfolio metrics including cost basis, unrealized returns, and fees
 */
export class PortfolioCalculator {
  /**
   * Gets all on-chain wallets
   */
  static getOnChainWallets(wallets: TWallet[]): TWallet[] {
    return wallets.filter(wallet => wallet.chain === Chain.ONCHAIN || wallet.chain === 'ONCHAIN');
  }

  /**
   * Calculates cost basis for all wallets
   * Cost basis = Sum of (UTXO value × price at first-seen time)
   *
   * @param wallets - Array of wallets
   * @param currency - Currency code
   * @returns Cost basis in local currency
   */
  static async calculateCostBasis(wallets: TWallet[], currency: string): Promise<number> {
    const onChainWallets = this.getOnChainWallets(wallets);
    let totalCostBasis = new BigNumber(0);

    for (const wallet of onChainWallets) {
      const utxosWithTimestamp = UtxoTracker.getUtxosWithFirstSeen(wallet);

      // Only count confirmed UTXOs (exclude unconfirmed)
      const confirmedUtxos = utxosWithTimestamp.filter(utxo => {
        const metadata = wallet.getUTXOMetadata(utxo.txid, utxo.vout);
        return (utxo.confirmations ?? 0) > 0;
      });

      // Get unique dates for price fetching
      const dates = new Set<string>();
      for (const utxo of confirmedUtxos) {
        const date = new Date(utxo.firstSeenTimestamp);
        dates.add(this.formatDate(date));
      }

      // Fetch prices for all dates
      const dateArray = Array.from(dates).map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      });
      const prices = await PriceService.getHistoricalPrices(dateArray, currency);

      // Calculate cost basis
      for (const utxo of confirmedUtxos) {
        const date = new Date(utxo.firstSeenTimestamp);
        const dateStr = this.formatDate(date);
        const price = prices.get(dateStr) || 0;

        if (price > 0) {
          // Convert sats to BTC, then multiply by price
          const btcAmount = new BigNumber(utxo.value).dividedBy(100000000);
          const costBasis = btcAmount.multipliedBy(price);
          totalCostBasis = totalCostBasis.plus(costBasis);
        }
      }
    }

    return totalCostBasis.toNumber();
  }

  /**
   * Calculates total balance across all on-chain wallets
   *
   * @param wallets - Array of wallets
   * @returns Total balance in sats
   */
  static calculateTotalBalance(wallets: TWallet[]): number {
    const onChainWallets = this.getOnChainWallets(wallets);
    return onChainWallets.reduce((total, wallet) => {
      return total + (wallet.getBalance() || 0);
    }, 0);
  }

  /**
   * Calculates current value of portfolio in local currency
   *
   * @param wallets - Array of wallets
   * @param currency - Currency code
   * @returns Current value in local currency
   */
  static async calculateCurrentValue(wallets: TWallet[], currency: string): Promise<number> {
    const totalBalance = this.calculateTotalBalance(wallets);
    const btcAmount = new BigNumber(totalBalance).dividedBy(100000000);

    // Get current price
    const currentPrice = await PriceService.getHistoricalPrice(new Date(), currency);
    return btcAmount.multipliedBy(currentPrice).toNumber();
  }

  /**
   * Calculates average buy price
   * Average buy price = Cost basis / Total BTC balance
   *
   * @param wallets - Array of wallets
   * @param currency - Currency code
   * @returns Average buy price in local currency per BTC, or 0 if balance is 0
   */
  static async calculateAverageBuyPrice(wallets: TWallet[], currency: string): Promise<number> {
    const totalBalance = this.calculateTotalBalance(wallets);
    if (totalBalance === 0) {
      return 0;
    }

    const costBasis = await this.calculateCostBasis(wallets, currency);
    const btcAmount = new BigNumber(totalBalance).dividedBy(100000000);

    if (btcAmount.isZero()) {
      return 0;
    }

    return new BigNumber(costBasis).dividedBy(btcAmount).toNumber();
  }

  /**
   * Calculates unrealized return
   * Unrealized return = Current value - Cost basis
   *
   * @param wallets - Array of wallets
   * @param currency - Currency code
   * @returns Object with unrealized return amount and percentage
   */
  static async calculateUnrealizedReturn(
    wallets: TWallet[],
    currency: string,
  ): Promise<{ amount: number; percent: number }> {
    const currentValue = await this.calculateCurrentValue(wallets, currency);
    const costBasis = await this.calculateCostBasis(wallets, currency);

    const amount = currentValue - costBasis;
    const percent = costBasis > 0 ? (amount / costBasis) * 100 : 0;

    return { amount, percent };
  }

  /**
   * Calculates total fees spent across all wallets
   * Only counts fees from outgoing transactions (value < 0)
   *
   * @param wallets - Array of wallets
   * @returns Fees data including total fees and percentage
   */
  static calculateFeesSpent(wallets: TWallet[]): FeesData {
    const onChainWallets = this.getOnChainWallets(wallets);
    let totalFeesSats = new BigNumber(0);

    for (const wallet of onChainWallets) {
      const transactions = wallet.getTransactions();

      for (const tx of transactions) {
        // Only count outgoing transactions (value < 0)
        if (tx.value && tx.value < 0) {
          // Calculate fee: (inputs value - outputs value)
          let inputsValue = 0;
          let outputsValue = 0;

          // Sum input values (UTXOs being spent)
          for (const input of tx.inputs) {
            if (input.value) {
              inputsValue += input.value;
            }
          }

          // Sum output values
          for (const output of tx.outputs) {
            const value = new BigNumber(output.value).multipliedBy(100000000).toNumber();
            outputsValue += value;
          }

          const fee = inputsValue - outputsValue;
          if (fee > 0) {
            totalFeesSats = totalFeesSats.plus(fee);
          }
        }
      }
    }

    return {
      totalFeesSats: totalFeesSats.toNumber(),
      totalFeesValue: 0, // Will be calculated with current price
      feesPercent: 0, // Will be calculated
      isGood: false, // Will be calculated
    };
  }

  /**
   * Gets comprehensive portfolio metrics
   *
   * @param wallets - Array of wallets
   * @param currency - Currency code
   * @returns Portfolio metrics object
   */
  static async getMetrics(wallets: TWallet[], currency: string): Promise<PortfolioMetrics> {
    const totalBalance = this.calculateTotalBalance(wallets);
    const currentValue = await this.calculateCurrentValue(wallets, currency);
    const costBasis = await this.calculateCostBasis(wallets, currency);
    const averageBuyPrice = await this.calculateAverageBuyPrice(wallets, currency);
    const unrealizedReturn = await this.calculateUnrealizedReturn(wallets, currency);

    const feesData = this.calculateFeesSpent(wallets);
    const currentPrice = await PriceService.getHistoricalPrice(new Date(), currency);
    const btcAmount = new BigNumber(feesData.totalFeesSats).dividedBy(100000000);
    const feesSpentValue = btcAmount.multipliedBy(currentPrice).toNumber();
    const feesPercent = currentValue > 0 ? (feesSpentValue / currentValue) * 100 : 0;

    return {
      totalBalance,
      currentValue,
      costBasis,
      averageBuyPrice,
      unrealizedReturn: unrealizedReturn.amount,
      unrealizedReturnPercent: unrealizedReturn.percent,
      feesSpent: feesData.totalFeesSats,
      feesSpentValue,
      feesPercent,
    };
  }

  /**
   * Gets portfolio history for chart display
   * Generates time-series data points at regular intervals based on time range
   *
   * @param wallets - Array of wallets
   * @param timeRange - Time range filter
   * @param currency - Currency code
   * @returns Array of chart data points
   */
  static async getPortfolioHistory(
    wallets: TWallet[],
    timeRange: TimeRange,
    currency: string,
  ): Promise<ChartDataPoint[]> {
    console.log('PortfolioCalculator: ========== getPortfolioHistory START ==========');
    console.log('PortfolioCalculator: Input params:', { timeRange, currency, walletsCount: wallets.length });
    console.log('PortfolioCalculator: Wallet labels:', wallets.map(w => w.getLabel()));
    
    const onChainWallets = this.getOnChainWallets(wallets);
    console.log('PortfolioCalculator: On-chain wallets:', onChainWallets.length);
    console.log('PortfolioCalculator: On-chain wallet labels:', onChainWallets.map(w => w.getLabel()));
    
    // Calculate actual current balance for comparison
    const actualCurrentBalance = this.calculateTotalBalance(wallets);
    console.log('PortfolioCalculator: ACTUAL current balance from calculateTotalBalance:', actualCurrentBalance, 'sats =', (actualCurrentBalance / 100000000).toFixed(8), 'BTC');
    
    const now = Date.now();
    let startDate = PortfolioCalculator.getStartDateForRange(timeRange, now);
    
    // For "All" time range, use the first UTXO's timestamp as the start date
    // We'll update this after we collect all UTXOs
    if (timeRange === 'All') {
      startDate = 0; // Will be updated below
    }
    
    console.log('PortfolioCalculator: Time range', { timeRange, startDate: startDate > 0 ? new Date(startDate).toISOString() : 'All time', now: new Date(now).toISOString() });

    // Step 1: Identify and aggregate all UTXOs from all wallets
    const allUtxos: Array<{
      utxo: ReturnType<typeof UtxoTracker.getUtxosWithFirstSeen>[0];
      wallet: TWallet;
    }> = [];

    for (const wallet of onChainWallets) {
      const walletLabel = wallet.getLabel();
      const walletBalance = wallet.getBalance() || 0;
      console.log(`PortfolioCalculator: Processing wallet "${walletLabel}" with balance:`, walletBalance, 'sats =', (walletBalance / 100000000).toFixed(8), 'BTC');
      
      // Get UTXOs the same way CoinControl does: wallet.getUtxo(true)
      const rawUtxos = wallet.getUtxo(true);
      console.log(`PortfolioCalculator: Wallet "${walletLabel}" - Raw UTXOs from getUtxo(true):`, rawUtxos.length);
      
      // Calculate sum of raw UTXOs (like CoinControl would show)
      let rawUtxoSum = 0;
      for (const utxo of rawUtxos) {
        if (utxo && typeof utxo.value === 'number' && !isNaN(utxo.value) && utxo.value > 0) {
          rawUtxoSum += utxo.value;
        }
      }
      console.log(`PortfolioCalculator: Wallet "${walletLabel}" - Raw UTXO sum (like CoinControl):`, rawUtxoSum, 'sats =', (rawUtxoSum / 100000000).toFixed(8), 'BTC');
      console.log(`PortfolioCalculator: Wallet "${walletLabel}" - Balance vs raw UTXO sum diff:`, Math.abs(walletBalance - rawUtxoSum), 'sats');
      
      // Now get UTXOs with first-seen timestamps
      const utxos = UtxoTracker.getUtxosWithFirstSeen(wallet);
      console.log(`PortfolioCalculator: Wallet "${walletLabel}" has ${utxos.length} total UTXOs from getUtxosWithFirstSeen`);
      
      // Verify they match
      if (utxos.length !== rawUtxos.length) {
        console.warn(`PortfolioCalculator: ⚠️ UTXO count mismatch! Raw: ${rawUtxos.length}, With timestamps: ${utxos.length}`);
      }
      
      // Only include confirmed UTXOs
      const confirmedUtxos = utxos.filter(utxo => (utxo.confirmations ?? 0) > 0);
      const unconfirmedCount = utxos.length - confirmedUtxos.length;
      console.log(`PortfolioCalculator: Wallet "${walletLabel}" has ${confirmedUtxos.length} confirmed UTXOs, ${unconfirmedCount} unconfirmed`);
      
      // Calculate sum of confirmed UTXO values for this wallet
      let walletUtxoSum = 0;
      for (const utxo of confirmedUtxos) {
        if (utxo && typeof utxo.value === 'number' && !isNaN(utxo.value) && utxo.value > 0) {
          walletUtxoSum += utxo.value;
        }
      }
      console.log(`PortfolioCalculator: Wallet "${walletLabel}" confirmed UTXO sum:`, walletUtxoSum, 'sats =', (walletUtxoSum / 100000000).toFixed(8), 'BTC');
      console.log(`PortfolioCalculator: Wallet "${walletLabel}" balance vs confirmed UTXO sum diff:`, Math.abs(walletBalance - walletUtxoSum), 'sats');
      
      // Log unconfirmed UTXO sum if any
      if (unconfirmedCount > 0) {
        let unconfirmedSum = 0;
        for (const utxo of utxos) {
          if ((utxo.confirmations ?? 0) === 0 && utxo && typeof utxo.value === 'number' && !isNaN(utxo.value) && utxo.value > 0) {
            unconfirmedSum += utxo.value;
          }
        }
        console.log(`PortfolioCalculator: Wallet "${walletLabel}" unconfirmed UTXO sum:`, unconfirmedSum, 'sats =', (unconfirmedSum / 100000000).toFixed(8), 'BTC');
      }
      
      for (const utxo of confirmedUtxos) {
        // Validate UTXO
        if (!utxo || typeof utxo.value !== 'number' || isNaN(utxo.value) || utxo.value <= 0) {
          console.warn('PortfolioCalculator: Invalid UTXO value:', utxo);
          continue;
        }
        if (!utxo.firstSeenTimestamp || typeof utxo.firstSeenTimestamp !== 'number') {
          console.warn('PortfolioCalculator: Missing firstSeenTimestamp:', utxo);
          continue;
        }
        allUtxos.push({ utxo, wallet });
      }
    }

    console.log('PortfolioCalculator: Total UTXOs collected:', allUtxos.length);
    
    // Calculate total from all collected UTXOs
    let totalFromUtxos = 0;
    for (const { utxo } of allUtxos) {
      if (utxo && typeof utxo.value === 'number' && !isNaN(utxo.value) && utxo.value > 0) {
        totalFromUtxos += utxo.value;
      }
    }
    console.log('PortfolioCalculator: Total from all collected UTXOs:', totalFromUtxos, 'sats =', (totalFromUtxos / 100000000).toFixed(8), 'BTC');
    console.log('PortfolioCalculator: Actual balance vs UTXO sum:', {
      actual: actualCurrentBalance,
      utxoSum: totalFromUtxos,
      diff: Math.abs(actualCurrentBalance - totalFromUtxos),
      diffPercent: actualCurrentBalance > 0 ? ((Math.abs(actualCurrentBalance - totalFromUtxos) / actualCurrentBalance) * 100).toFixed(2) + '%' : 'N/A'
    });
    
    if (allUtxos.length === 0) {
      console.log('PortfolioCalculator: No UTXOs found');
      return [];
    }

    // Step 2: Sort UTXOs by first-seen timestamp
    allUtxos.sort((a, b) => a.utxo.firstSeenTimestamp - b.utxo.firstSeenTimestamp);
    console.log('PortfolioCalculator: UTXOs sorted, first timestamp:', new Date(allUtxos[0].utxo.firstSeenTimestamp).toISOString());
    console.log('PortfolioCalculator: UTXOs sorted, last timestamp:', new Date(allUtxos[allUtxos.length - 1].utxo.firstSeenTimestamp).toISOString());

    // For "All" time range, set startDate to the first UTXO's timestamp
    // This ensures we show the full history from the earliest acquisition
    if (timeRange === 'All' && allUtxos.length > 0) {
      const firstUtxoTimestamp = allUtxos[0].utxo.firstSeenTimestamp;
      startDate = firstUtxoTimestamp;
      const yearsSinceFirstUtxo = (now - firstUtxoTimestamp) / (1000 * 60 * 60 * 24 * 365);
      console.log('PortfolioCalculator: "All" range - using first UTXO timestamp as start:', new Date(startDate).toISOString());
      console.log('PortfolioCalculator: "All" range - years since first UTXO:', yearsSinceFirstUtxo.toFixed(2));
      console.log('PortfolioCalculator: "All" range - first UTXO date:', new Date(firstUtxoTimestamp).toISOString());
      console.log('PortfolioCalculator: "All" range - current date:', new Date(now).toISOString());
    } else if (timeRange === 'All' && allUtxos.length === 0) {
      // No UTXOs - use a default start date (e.g., 10 years ago)
      const defaultStartDate = now - (10 * 365 * 24 * 60 * 60 * 1000);
      startDate = defaultStartDate;
      console.log('PortfolioCalculator: "All" range - no UTXOs, using default start date:', new Date(startDate).toISOString());
    }

    // Step 3: Calculate initial balance (from UTXOs before the range)
    // For "All", there are no UTXOs before the range (startDate is the first UTXO)
    const utxosBeforeRange = allUtxos.filter(({ utxo }) => utxo.firstSeenTimestamp < startDate);
    console.log('PortfolioCalculator: UTXOs before range:', utxosBeforeRange.length);
    let initialBalance = new BigNumber(0);
    for (const { utxo } of utxosBeforeRange) {
      initialBalance = initialBalance.plus(utxo.value);
    }
    console.log('PortfolioCalculator: Initial balance (sats):', initialBalance.toNumber());

    // Step 4: Generate time intervals based on time range
    console.log('PortfolioCalculator: Generating intervals for', timeRange, 'with startDate:', new Date(startDate).toISOString(), 'endDate:', new Date(now).toISOString());
    const intervals = this.generateTimeIntervals(timeRange, startDate, now);
    console.log('PortfolioCalculator: Generated intervals:', intervals.length);
    if (intervals.length > 0) {
      console.log('PortfolioCalculator: First interval:', new Date(intervals[0]).toISOString());
      console.log('PortfolioCalculator: Last interval:', new Date(intervals[intervals.length - 1]).toISOString());
      
      // Compare with 5Y for debugging
      if (timeRange === 'All') {
        const fiveYearsAgo = now - (5 * 365 * 24 * 60 * 60 * 1000);
        const fiveYearsAgoDate = new Date(fiveYearsAgo);
        const allStartDate = new Date(startDate);
        const yearsDifference = (now - startDate) / (1000 * 60 * 60 * 24 * 365);
        const fiveYearsSpan = (now - fiveYearsAgo) / (1000 * 60 * 60 * 24 * 365);
        const daysDifference = (startDate - fiveYearsAgo) / (1000 * 60 * 60 * 24);
        
        console.log('PortfolioCalculator: "All" vs "5Y" comparison:');
        console.log('PortfolioCalculator:   "All" start:', allStartDate.toISOString());
        console.log('PortfolioCalculator:   "5Y" start:', fiveYearsAgoDate.toISOString());
        console.log('PortfolioCalculator:   "All" span (years):', yearsDifference.toFixed(2));
        console.log('PortfolioCalculator:   "5Y" span (years):', fiveYearsSpan.toFixed(2));
        console.log('PortfolioCalculator:   Days difference (All start - 5Y start):', daysDifference.toFixed(0));
        
        if (Math.abs(daysDifference) < 30) {
          console.warn('PortfolioCalculator: ⚠️ "All" and "5Y" are very similar (within 30 days). This is expected if your first UTXO is around 5 years old.');
        }
      }
    }
    
    // Step 5: For each interval, calculate cumulative balance and fetch price
    const dataPoints: ChartDataPoint[] = [];
    const datesToFetchPrices: Date[] = [];
    
    // Collect all dates we need prices for
    for (const interval of intervals) {
      datesToFetchPrices.push(interval);
    }

    console.log('PortfolioCalculator: Fetching prices for', datesToFetchPrices.length, 'dates');
    // Batch fetch prices for all intervals
    const pricesByDate = await PriceService.getHistoricalPrices(datesToFetchPrices, currency);
    console.log('PortfolioCalculator: Received prices for', pricesByDate.size, 'dates');

    // Get fallback price (current price) in case some dates fail
    let fallbackPrice = 0;
    try {
      fallbackPrice = await PriceService.getHistoricalPrice(new Date(), currency);
    } catch (error) {
      console.warn('PortfolioCalculator: Failed to fetch fallback price:', error);
    }

    // Step 6: For each interval, calculate balance at that point in time
    console.log('PortfolioCalculator: Processing intervals to create data points...');
    
    // Calculate current total balance from wallet.getBalance() to ensure consistency
    const calculatedBalance = this.calculateTotalBalance(wallets);
    console.log('PortfolioCalculator: ========== BALANCE CALCULATION ==========');
    console.log('PortfolioCalculator: Current total balance from calculateTotalBalance (sats):', calculatedBalance);
    console.log('PortfolioCalculator: Current total balance from calculateTotalBalance (BTC):', (calculatedBalance / 100000000).toFixed(8));
    
    // Calculate current total balance from all unspent UTXOs we collected
    let currentTotalBalanceFromUtxos = new BigNumber(0);
    for (const { utxo } of allUtxos) {
      currentTotalBalanceFromUtxos = currentTotalBalanceFromUtxos.plus(utxo.value);
    }
    console.log('PortfolioCalculator: Current total balance from UTXOs (sats):', currentTotalBalanceFromUtxos.toNumber());
    console.log('PortfolioCalculator: Current total balance from UTXOs (BTC):', (currentTotalBalanceFromUtxos.toNumber() / 100000000).toFixed(8));
    
    // Use the calculated balance as the source of truth (from wallet.getBalance())
    // This ensures the chart matches the displayed total balance
    const currentTotalBalance = new BigNumber(calculatedBalance);
    
    // If there's a significant mismatch, log a warning
    const balanceDiff = Math.abs(currentTotalBalanceFromUtxos.toNumber() - calculatedBalance);
    const balanceDiffPercent = calculatedBalance > 0 ? ((balanceDiff / calculatedBalance) * 100).toFixed(2) : '0.00';
    console.log('PortfolioCalculator: Balance comparison:', {
      calculated: calculatedBalance,
      utxoSum: currentTotalBalanceFromUtxos.toNumber(),
      difference: balanceDiff,
      differencePercent: balanceDiffPercent + '%',
      threshold: 1000
    });
    
    if (balanceDiff > 1000) { // Allow 1000 sats difference for rounding
      console.warn('PortfolioCalculator: ⚠️ BALANCE MISMATCH DETECTED!');
      console.warn('PortfolioCalculator: UTXO sum:', currentTotalBalanceFromUtxos.toNumber(), 'sats =', (currentTotalBalanceFromUtxos.toNumber() / 100000000).toFixed(8), 'BTC');
      console.warn('PortfolioCalculator: Calculated balance:', calculatedBalance, 'sats =', (calculatedBalance / 100000000).toFixed(8), 'BTC');
      console.warn('PortfolioCalculator: Difference:', balanceDiff, 'sats =', (balanceDiff / 100000000).toFixed(8), 'BTC');
      console.warn('PortfolioCalculator: Using calculated balance as source of truth');
    } else {
      console.log('PortfolioCalculator: ✅ Balance matches (within threshold)');
    }
    
    for (let i = 0; i < intervals.length; i++) {
      const intervalDate = intervals[i];
      const intervalTimestamp = intervalDate.getTime();
      const dateStr = this.formatDate(intervalDate);
      const isLastInterval = i === intervals.length - 1;
      
      // Check if this is the last interval and it's in the current period
      // For yearly intervals (5Y/All), if the last interval is in the current year, use current balance
      // For monthly intervals (1Y/6M), if the last interval is in the current month, use current balance
      // For weekly intervals (1M), if the last interval is in the current week, use current balance
      // For daily intervals (1W), if the last interval is today, use current balance
      let useCurrentBalance = false;
      if (isLastInterval) {
        const intervalDateDayjs = dayjs(intervalDate);
        const todayDayjs = dayjs(now);
        
        if (timeRange === '5Y' || timeRange === 'All') {
          useCurrentBalance = intervalDateDayjs.isSame(todayDayjs, 'year');
        } else if (timeRange === '1Y' || timeRange === '6M') {
          useCurrentBalance = intervalDateDayjs.isSame(todayDayjs, 'month');
        } else if (timeRange === '1M') {
          useCurrentBalance = intervalDateDayjs.isSame(todayDayjs, 'week');
        } else if (timeRange === '1W') {
          useCurrentBalance = intervalDateDayjs.isSame(todayDayjs, 'day');
        }
      }
      
      // Calculate cumulative balance: sum all CURRENTLY UNSPENT UTXOs received up to this interval
      // This shows "how much of your current holdings were accumulated by this date"
      // IMPORTANT: We only count UTXOs that are currently unspent (in allUtxos)
      // The initialBalance already includes UTXOs before the range, so we only add new ones
      let cumulativeBalance = initialBalance;
      let utxosAddedInRange = 0;
      
      if (useCurrentBalance) {
        // For the last interval in the current period, use the current total balance
        cumulativeBalance = currentTotalBalance;
        console.log(`PortfolioCalculator: ${dateStr} - Using current balance for last interval in current period:`, {
          btcAmount: (cumulativeBalance.toNumber() / 100000000).toFixed(8),
          currentTotalBalanceBTC: (currentTotalBalance.toNumber() / 100000000).toFixed(8)
        });
      } else {
        for (const { utxo } of allUtxos) {
          // Only count UTXOs that were received during the range (after startDate)
          // UTXOs before the range are already in initialBalance
          if (utxo.firstSeenTimestamp >= startDate && utxo.firstSeenTimestamp <= intervalTimestamp) {
            cumulativeBalance = cumulativeBalance.plus(utxo.value);
            utxosAddedInRange++;
          }
        }
        
        // The cumulative balance should never exceed the current total balance
        // Since we're only counting currently unspent UTXOs, this should already be correct
        // But we cap it as a safety measure
        
        console.log(`PortfolioCalculator: ${dateStr} - Cumulative balance calculation:`, {
          initialBalance: initialBalance.toNumber(),
          initialBalanceBTC: (initialBalance.toNumber() / 100000000).toFixed(8),
          utxosAddedInRange,
          cumulativeBeforeCap: cumulativeBalance.toNumber(),
          cumulativeBeforeCapBTC: (cumulativeBalance.toNumber() / 100000000).toFixed(8),
          currentTotalBalance: currentTotalBalance.toNumber(),
          currentTotalBalanceBTC: (currentTotalBalance.toNumber() / 100000000).toFixed(8)
        });
        
        // Cap the balance at the current total to prevent showing more than you actually have
        // This should never happen if our logic is correct, but it's a safety check
        if (cumulativeBalance.isGreaterThan(currentTotalBalance)) {
          const balanceBeforeCap = cumulativeBalance.toNumber();
          cumulativeBalance = currentTotalBalance;
          console.warn(`PortfolioCalculator: ⚠️ ${dateStr} - Capping balance (this shouldn't happen!):`, {
            before: balanceBeforeCap,
            after: cumulativeBalance.toNumber(),
            btcBefore: (balanceBeforeCap / 100000000).toFixed(8),
            btcAfter: (cumulativeBalance.toNumber() / 100000000).toFixed(8),
            initialBalanceBTC: (initialBalance.toNumber() / 100000000).toFixed(8),
            utxosAddedInRange
          });
        }
      }

      // Get price for this interval
      // For the last interval in current period, use today's price
      let price = pricesByDate.get(dateStr);
      if (!price || price <= 0) {
        if (useCurrentBalance) {
          // Try to get today's price
          try {
            const todayPrice = await PriceService.getHistoricalPrice(new Date(), currency);
            if (todayPrice && todayPrice > 0) {
              price = todayPrice;
              console.log(`PortfolioCalculator: Using today's price for last interval: ${price}`);
            } else {
              price = fallbackPrice;
              console.log(`PortfolioCalculator: Using fallback price for ${dateStr}: ${price}`);
            }
          } catch (error) {
            price = fallbackPrice;
            console.log(`PortfolioCalculator: Using fallback price for ${dateStr}: ${price}`);
          }
        } else {
          price = fallbackPrice;
          console.log(`PortfolioCalculator: Using fallback price for ${dateStr}: ${price}`);
        }
      } else {
        console.log(`PortfolioCalculator: Using fetched price for ${dateStr}: ${price}`);
      }

      if (price && price > 0 && cumulativeBalance.isGreaterThan(0)) {
        const btcAmount = cumulativeBalance.dividedBy(100000000);
        const localCurrencyValue = btcAmount.multipliedBy(price).toNumber();

        if (!isNaN(localCurrencyValue) && isFinite(localCurrencyValue) && localCurrencyValue >= 0) {
          // For the last interval in current period, use today's timestamp
          const finalTimestamp = useCurrentBalance ? now : intervalTimestamp;
          dataPoints.push({
            date: dateStr,
            timestamp: finalTimestamp,
            btcAmount: cumulativeBalance.toNumber(),
            localCurrencyValue,
          });
          console.log(`PortfolioCalculator: ✅ Added data point for ${dateStr}:`, {
            timestamp: finalTimestamp,
            btcAmount: btcAmount.toFixed(8),
            btcAmountSats: cumulativeBalance.toNumber(),
            localCurrencyValue: localCurrencyValue.toFixed(2),
            currency: currency,
            useCurrentBalance: useCurrentBalance ? 'Yes' : 'No'
          });
        } else {
          console.warn(`PortfolioCalculator: Invalid localCurrencyValue for ${dateStr}:`, localCurrencyValue);
        }
      } else {
        console.warn(`PortfolioCalculator: Skipping ${dateStr} - price: ${price}, balance: ${cumulativeBalance.toNumber()}`);
      }
    }
    
    console.log('PortfolioCalculator: ========== DATA POINTS SUMMARY ==========');
    console.log('PortfolioCalculator: Created', dataPoints.length, 'data points from intervals');
    if (dataPoints.length > 0) {
      const firstPoint = dataPoints[0];
      const lastPoint = dataPoints[dataPoints.length - 1];
      console.log('PortfolioCalculator: First data point:', {
        date: firstPoint.date,
        btcAmount: (firstPoint.btcAmount / 100000000).toFixed(8),
        localCurrencyValue: firstPoint.localCurrencyValue.toFixed(2)
      });
      console.log('PortfolioCalculator: Last data point:', {
        date: lastPoint.date,
        btcAmount: (lastPoint.btcAmount / 100000000).toFixed(8),
        localCurrencyValue: lastPoint.localCurrencyValue.toFixed(2)
      });
      console.log('PortfolioCalculator: Expected final balance:', (calculatedBalance / 100000000).toFixed(8), 'BTC');
      console.log('PortfolioCalculator: Actual final balance in chart:', (lastPoint.btcAmount / 100000000).toFixed(8), 'BTC');
      const finalDiff = Math.abs(lastPoint.btcAmount - calculatedBalance);
      console.log('PortfolioCalculator: Final balance difference:', finalDiff, 'sats =', (finalDiff / 100000000).toFixed(8), 'BTC');
    }
    console.log('PortfolioCalculator: ========== getPortfolioHistory END ==========');

    // Always add today's data point if we have balance
    // But skip if it's in the same period as the last interval (for yearly/monthly ranges)
    if (dataPoints.length > 0) {
      const today = new Date();
      const todayStr = this.formatDate(today);
      const lastPoint = dataPoints[dataPoints.length - 1];
      
      // Check if today is in the same period as the last interval
      const lastPointDate = dayjs(lastPoint.date);
      const todayDate = dayjs(todayStr);
      
      let shouldSkipToday = false;
      if (timeRange === '5Y' || timeRange === 'All') {
        // For yearly intervals, skip if today is in the same year
        shouldSkipToday = todayDate.isSame(lastPointDate, 'year');
      } else if (timeRange === '1Y' || timeRange === '6M') {
        // For monthly intervals, skip if today is in the same month
        shouldSkipToday = todayDate.isSame(lastPointDate, 'month');
      } else if (timeRange === '1M') {
        // For weekly intervals, skip if today is in the same week
        shouldSkipToday = todayDate.isSame(lastPointDate, 'week');
      } else if (timeRange === '1W') {
        // For daily intervals, skip if today is the same day
        shouldSkipToday = todayDate.isSame(lastPointDate, 'day');
      }
      
      console.log('PortfolioCalculator: Checking if we need to add today data point', { 
        todayStr, 
        lastPointDate: lastPoint.date,
        timeRange,
        shouldSkipToday,
        samePeriod: shouldSkipToday ? 'Yes - same period as last interval' : 'No - different period'
      });
      
      // Only add if it's different from the last point AND not in the same period
      if (lastPoint.date !== todayStr && !shouldSkipToday) {
        try {
          console.log('PortfolioCalculator: Fetching current price for today...');
          const currentPrice = await PriceService.getHistoricalPrice(today, currency);
          console.log('PortfolioCalculator: Current price:', currentPrice);
          if (currentPrice && currentPrice > 0) {
            // Use the actual current balance (from calculateTotalBalance) for today's data point
            // This ensures it matches the displayed total balance
            console.log('PortfolioCalculator: Final cumulative balance for today:', currentTotalBalance.toNumber(), 'sats =', (currentTotalBalance.toNumber() / 100000000).toFixed(8), 'BTC');
            if (currentTotalBalance.isGreaterThan(0)) {
              const btcAmount = currentTotalBalance.dividedBy(100000000);
              const todayPoint = {
                date: todayStr,
                timestamp: now,
                btcAmount: currentTotalBalance.toNumber(),
                localCurrencyValue: btcAmount.multipliedBy(currentPrice).toNumber(),
              };
              dataPoints.push(todayPoint);
              console.log('PortfolioCalculator: Added today data point:', {
                date: todayStr,
                timestamp: now,
                btcAmount: currentTotalBalance.toNumber(),
                btcAmountBTC: btcAmount.toFixed(8),
                localCurrencyValue: btcAmount.multipliedBy(currentPrice).toNumber()
              });
            }
          }
        } catch (error) {
          console.warn('PortfolioCalculator: Failed to add today data point:', error);
        }
      } else if (shouldSkipToday) {
        console.log('PortfolioCalculator: Skipping today data point - same period as last interval');
        // The last point should already have the current balance from the interval loop
        // Just verify it's correct and update price if needed
        if (lastPoint.btcAmount !== currentTotalBalance.toNumber()) {
          console.log('PortfolioCalculator: Last point balance mismatch, updating...');
          try {
            const currentPrice = await PriceService.getHistoricalPrice(today, currency);
            if (currentPrice && currentPrice > 0 && currentTotalBalance.isGreaterThan(0)) {
              const btcAmount = currentTotalBalance.dividedBy(100000000);
              lastPoint.btcAmount = currentTotalBalance.toNumber();
              lastPoint.localCurrencyValue = btcAmount.multipliedBy(currentPrice).toNumber();
              lastPoint.timestamp = now;
              console.log('PortfolioCalculator: Updated last data point with today\'s balance:', {
                date: lastPoint.date,
                btcAmount: btcAmount.toFixed(8),
                localCurrencyValue: lastPoint.localCurrencyValue.toFixed(2)
              });
            }
          } catch (error) {
            console.warn('PortfolioCalculator: Failed to update last data point:', error);
          }
        } else {
          console.log('PortfolioCalculator: Last point already has current balance, no update needed');
        }
      }
    }

    // Sort data points by timestamp
    dataPoints.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`PortfolioCalculator: Final result - Generated ${dataPoints.length} data points for ${timeRange} range`);
    if (dataPoints.length > 0) {
      console.log('PortfolioCalculator: First data point:', dataPoints[0]);
      console.log('PortfolioCalculator: Last data point:', dataPoints[dataPoints.length - 1]);
    }
    return dataPoints;
  }

  /**
   * Generates time intervals based on the selected time range
   * 
   * @param timeRange - Time range filter
   * @param startDate - Start timestamp
   * @param endDate - End timestamp (now)
   * @returns Array of Date objects representing interval points
   */
  private static generateTimeIntervals(timeRange: TimeRange, startDate: number, endDate: number): Date[] {
    const intervals: Date[] = [];
    
    // Safety check: ensure startDate is valid
    if (!startDate || startDate <= 0 || isNaN(startDate)) {
      console.warn('PortfolioCalculator: Invalid startDate for generateTimeIntervals:', startDate);
      return [];
    }
    
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    
    // Safety check: ensure dates are valid
    if (!start.isValid() || !end.isValid()) {
      console.warn('PortfolioCalculator: Invalid dates for generateTimeIntervals:', { startDate, endDate });
      return [];
    }
    
    let current = start.startOf('day');
    const endDay = end.startOf('day');

    switch (timeRange) {
      case '1W':
        // Daily intervals for 1 week
        while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
          intervals.push(current.toDate());
          current = current.add(1, 'day');
          if (current.isAfter(endDay)) break;
        }
        break;

      case '1M':
        // Weekly intervals for 1 month - makes the chart smaller and easier to see
        current = current.startOf('week'); // Start from beginning of week
        while (current.isBefore(endDay) || current.isSame(endDay, 'week')) {
          intervals.push(current.toDate());
          current = current.add(1, 'week');
          if (current.isAfter(endDay)) break;
        }
        break;

      case '6M':
      case '1Y':
        // Monthly intervals for 6 months or 1 year
        current = current.startOf('month');
        while (current.isBefore(endDay) || current.isSame(endDay, 'month')) {
          intervals.push(current.toDate());
          current = current.add(1, 'month');
          if (current.isAfter(endDay)) break;
        }
        break;

      case '5Y':
        // Yearly intervals for 5 years - makes the chart smaller and easier to see
        current = current.startOf('year');
        while (current.isBefore(endDay) || current.isSame(endDay, 'year')) {
          intervals.push(current.toDate());
          current = current.add(1, 'year');
          if (current.isAfter(endDay)) break;
        }
        break;

      case 'All':
        // Yearly intervals for all time - makes the chart smaller and easier to see
        current = current.startOf('year');
        while (current.isBefore(endDay) || current.isSame(endDay, 'year')) {
          intervals.push(current.toDate());
          current = current.add(1, 'year');
          if (current.isAfter(endDay)) break;
        }
        break;
    }

    return intervals;
  }

  /**
   * Gets start date for a time range
   *
   * @param timeRange - Time range
   * @param now - Current timestamp
   * @returns Start timestamp
   */
  static getStartDateForRange(timeRange: TimeRange, now: number): number {
    const nowDate = new Date(now);

    switch (timeRange) {
      case '1W':
        nowDate.setDate(nowDate.getDate() - 7);
        break;
      case '1M':
        nowDate.setMonth(nowDate.getMonth() - 1);
        break;
      case '6M':
        nowDate.setMonth(nowDate.getMonth() - 6);
        break;
      case '1Y':
        nowDate.setFullYear(nowDate.getFullYear() - 1);
        break;
      case '5Y':
        nowDate.setFullYear(nowDate.getFullYear() - 5);
        break;
      case 'All':
        return 0; // All time
    }

    return nowDate.getTime();
  }

  /**
   * Formats date as YYYY-MM-DD
   */
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Gets fees data with current price conversion
   *
   * @param wallets - Array of wallets
   * @param currency - Currency code
   * @returns Fees data with value and percentage
   */
  static async getFeesData(wallets: TWallet[], currency: string): Promise<FeesData> {
    const feesData = this.calculateFeesSpent(wallets);
    const currentPrice = await PriceService.getHistoricalPrice(new Date(), currency);
    const btcAmount = new BigNumber(feesData.totalFeesSats).dividedBy(100000000);
    const totalFeesValue = btcAmount.multipliedBy(currentPrice).toNumber();

    const currentValue = await this.calculateCurrentValue(wallets, currency);
    const feesPercent = currentValue > 0 ? (totalFeesValue / currentValue) * 100 : 0;

    return {
      totalFeesSats: feesData.totalFeesSats,
      totalFeesValue,
      feesPercent,
      isGood: feesPercent < 0.5, // < 0.5% is good
    };
  }
}

