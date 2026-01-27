import Realm from 'realm';
import { BlueApp as BlueAppClass } from '../blue-app';
import { FiatUnitType } from '../../models/fiatUnit';

const BlueApp = BlueAppClass.getInstance();

interface HistoricalPriceData {
  price: number;
  lastUpdated: number;
  isEstimated: boolean;
}

/**
 * Service for fetching and caching historical Bitcoin prices from CoinGecko
 * Uses existing KeyValue Realm schema to avoid schema migrations
 */
export class PriceService {
  private static readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private static readonly CACHE_KEY_PREFIX = 'historical_price_';
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests for free tier
  private static lastApiCallTime = 0;
  private static isRateLimited = false; // Track if we're currently rate limited
  private static rateLimitDetectedAt = 0; // Timestamp when rate limit was detected
  private static readonly RATE_LIMIT_COOLDOWN = 60000; // Wait 60 seconds before trying API again after rate limit

  /**
   * Gets historical price for a specific date
   * Checks cache first, then fetches from CoinGecko if needed
   * If API fails, returns cached data if available (even if old)
   *
   * @param date - Date to get price for
   * @param currency - Currency code (e.g., 'USD', 'EUR')
   * @returns Price in the specified currency
   */
  static async getHistoricalPrice(date: Date, currency: string): Promise<number> {
    const cacheKey = this.getCacheKey(date, currency);
    const cached = await this.getCachedPrice(cacheKey);

    // If we have cached data, use it immediately
    if (cached && cached.price > 0) {
      console.log(`PriceService: Using cached price for ${cacheKey}: ${cached.price}`);
      return cached.price;
    }

    // No cache, try to fetch from API
    try {
      await this.rateLimit();
      const price = await this.fetchPriceFromCoinGecko(date, currency);
      if (price > 0) {
        await this.cachePrice(cacheKey, price, false);
        return price;
      }
    } catch (error) {
      console.warn(`PriceService: CoinGecko failed for ${cacheKey}:`, error);
      
      // Before failing, check if we have any cached price (even from a different date)
      const nearestCached = await this.findNearestCachedPrice(date, currency);
      if (nearestCached && nearestCached.price > 0) {
        console.log(`PriceService: Using nearest cached price as fallback: ${nearestCached.price}`);
        return nearestCached.price;
      }
      
      // Last resort: if we have any cached data (even old), use it
      if (cached && cached.price > 0) {
        console.log(`PriceService: Using cached price as last resort: ${cached.price}`);
        return cached.price;
      }
    }

    // Last resort: try to find nearest cached price
    const nearestCached = await this.findNearestCachedPrice(date, currency);
    if (nearestCached && nearestCached.price > 0) {
      console.log(`PriceService: Using nearest cached price: ${nearestCached.price}`);
      return nearestCached.price;
    }

    // If all else fails, throw error
    throw new Error(`Unable to fetch or find cached price for date: ${date.toISOString()}`);
  }

  /**
   * Gets historical prices for multiple dates (batched)
   * More efficient than individual calls
   * Uses cache first, only fetches missing dates from API
   *
   * @param dates - Array of dates to get prices for
   * @param currency - Currency code
   * @returns Map of date strings to prices
   */
  static async getHistoricalPrices(
    dates: Date[],
    currency: string,
  ): Promise<Map<string, number>> {
    console.log(`PriceService: getHistoricalPrices called for ${dates.length} dates, currency: ${currency}`);
    const results = new Map<string, number>();
    const datesToFetch: Date[] = [];

    // Check cache first - use cached data if available
    let cachedCount = 0;
    for (const date of dates) {
      const cacheKey = this.getCacheKey(date, currency);
      const cached = await this.getCachedPrice(cacheKey);

      if (cached && cached.price > 0) {
        const dateStr = this.formatDate(date);
        results.set(dateStr, cached.price);
        cachedCount++;
        console.log(`PriceService: Using cached price for ${dateStr}: ${cached.price}`);
      } else {
        datesToFetch.push(date);
      }
    }

    console.log(`PriceService: Found ${cachedCount} cached prices, need to fetch ${datesToFetch.length} from API`);

    // Check if we're currently rate limited - if so, skip API calls entirely
    if (this.isRateLimited) {
      const timeSinceRateLimit = Date.now() - this.rateLimitDetectedAt;
      if (timeSinceRateLimit < this.RATE_LIMIT_COOLDOWN) {
        console.log(`PriceService: Currently rate limited, using cached data only for ${datesToFetch.length} missing dates`);
        for (const date of datesToFetch) {
          const dateStr = this.formatDate(date);
          const nearestCached = await this.findNearestCachedPrice(date, currency);
          if (nearestCached && nearestCached.price > 0) {
            results.set(dateStr, nearestCached.price);
            console.log(`PriceService: Using nearest cached price (rate limit mode) for ${dateStr}: ${nearestCached.price}`);
          }
        }
        return results;
      } else {
        // Cooldown expired, reset flag
        this.isRateLimited = false;
        console.log('PriceService: Rate limit cooldown expired, will try API again');
      }
    }

    // Only fetch missing prices from API - but check for nearest cached first if we're rate limited
    let consecutiveRateLimitErrors = 0;
    const MAX_RATE_LIMIT_ERRORS = 2; // After 2 rate limit errors, stop trying API and use cache only
    
    for (const date of datesToFetch) {
      const dateStr = this.formatDate(date);
      
      // If we've hit rate limits multiple times, just use cached data without trying API
      if (consecutiveRateLimitErrors >= MAX_RATE_LIMIT_ERRORS) {
        console.log(`PriceService: Too many rate limit errors, using cached data only for ${dateStr}`);
        const nearestCached = await this.findNearestCachedPrice(date, currency);
        if (nearestCached && nearestCached.price > 0) {
          results.set(dateStr, nearestCached.price);
          console.log(`PriceService: Using nearest cached price (rate limit mode) for ${dateStr}: ${nearestCached.price}`);
        }
        continue;
      }
      
      try {
        await this.rateLimit();
        const price = await this.fetchPriceFromCoinGecko(date, currency);
        consecutiveRateLimitErrors = 0; // Reset counter on success
        if (price > 0) {
          results.set(dateStr, price);
          const cacheKey = this.getCacheKey(date, currency);
          await this.cachePrice(cacheKey, price, false);
        } else {
          // CoinGecko API returned 0 or invalid price, try to find nearest cached price
          const nearestCached = await this.findNearestCachedPrice(date, currency);
          if (nearestCached && nearestCached.price > 0) {
            results.set(dateStr, nearestCached.price);
            console.log(`PriceService: Using nearest cached price for ${dateStr}: ${nearestCached.price}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limited');
        const isUnauthorized = errorMessage.includes('401') || errorMessage.includes('Unauthorized');
        
        if (isRateLimit) {
          consecutiveRateLimitErrors++;
          console.warn(`PriceService: Rate limited (${consecutiveRateLimitErrors}/${MAX_RATE_LIMIT_ERRORS}), using cached data for ${dateStr}`);
        } else if (isUnauthorized) {
          // 401 errors are expected for free tier - silently use cache
          console.log(`PriceService: API unauthorized (401) for ${dateStr}, using cached data`);
        } else {
          consecutiveRateLimitErrors = 0; // Reset on non-rate-limit errors
          console.warn(`PriceService: Failed to fetch price for ${dateStr}:`, error);
        }
        
        // Try to find nearest cached price as fallback
        const nearestCached = await this.findNearestCachedPrice(date, currency);
        if (nearestCached && nearestCached.price > 0) {
          results.set(dateStr, nearestCached.price);
          console.log(`PriceService: Using nearest cached price as fallback for ${dateStr}: ${nearestCached.price}`);
        }
      }
    }

    return results;
  }

  /**
   * Fetches price from CoinGecko API
   * Uses history endpoint for specific dates
   * Throws error on failure (caller should handle with cached fallback)
   *
   * @param date - Date to fetch price for
   * @param currency - Currency code
   * @returns Price in the specified currency
   * @throws Error if API call fails
   */
  private static async fetchPriceFromCoinGecko(date: Date, currency: string): Promise<number> {
    // Check if we're in rate limit cooldown period
    if (this.isRateLimited) {
      const timeSinceRateLimit = Date.now() - this.rateLimitDetectedAt;
      if (timeSinceRateLimit < this.RATE_LIMIT_COOLDOWN) {
        throw new Error(`CoinGecko API rate limited (429). Use cached data if available.`);
      } else {
        // Cooldown period passed, reset rate limit flag
        this.isRateLimited = false;
        console.log('PriceService: Rate limit cooldown expired, trying API again');
      }
    }

    const dateStr = this.formatDateForCoinGecko(date);
    const url = `${this.COINGECKO_BASE_URL}/coins/bitcoin/history?date=${dateStr}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - set flag and throw error
        this.isRateLimited = true;
        this.rateLimitDetectedAt = Date.now();
        console.warn('PriceService: Rate limit detected, will use cache only for next 60 seconds');
        throw new Error(`CoinGecko API rate limited (429). Use cached data if available.`);
      }
      if (response.status === 401) {
        // Unauthorized - likely free tier limit or invalid key, use cache silently
        throw new Error(`CoinGecko API unauthorized (401). Use cached data if available.`);
      }
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    // Success - reset rate limit flag
    this.isRateLimited = false;

    const data = await response.json();
    const price = data.market_data?.current_price?.[currency.toLowerCase()];

    if (!price || price <= 0) {
      throw new Error(`No price data available for date: ${dateStr}`);
    }

    return price;
  }


  /**
   * Finds nearest cached price for a date
   * Searches within 30 days before/after the target date
   *
   * @param date - Target date
   * @param currency - Currency code
   * @returns Nearest cached price data or null
   */
  private static async findNearestCachedPrice(
    date: Date,
    currency: string,
  ): Promise<HistoricalPriceData | null> {
    try {
      const realm = await BlueApp.openRealmKeyValue();
      const prefix = `${this.CACHE_KEY_PREFIX}`;
      const currencySuffix = `_${currency.toUpperCase()}`;
      
      // Get all cached prices for this currency
      const allCached = realm.objects('KeyValue').filtered('key BEGINSWITH $0', prefix);
      const targetTime = date.getTime();
      let nearest: HistoricalPriceData | null = null;
      let nearestDistance = Infinity;

      for (const item of allCached) {
        if (item.key.endsWith(currencySuffix)) {
          try {
            if (!item.value) continue;
            const cached = JSON.parse(item.value) as HistoricalPriceData;
            if (cached && typeof cached.price === 'number' && !isNaN(cached.price) && isFinite(cached.price) && cached.price > 0) {
              // Extract date from cache key (format: historical_price_YYYY-MM-DD_CURRENCY)
              const datePart = item.key.replace(prefix, '').replace(currencySuffix, '');
              const cachedDate = new Date(datePart + 'T00:00:00');
              if (isNaN(cachedDate.getTime())) continue; // Invalid date
              
              const distance = Math.abs(cachedDate.getTime() - targetTime);
              
              // Only consider dates within 30 days
              if (distance < 30 * 24 * 60 * 60 * 1000 && distance < nearestDistance) {
                nearest = cached;
                nearestDistance = distance;
              }
            }
          } catch (error) {
            // Skip invalid cache entries
            continue;
          }
        }
      }

      return nearest;
    } catch (error) {
      console.error('Error finding nearest cached price:', error);
      return null;
    }
  }

  /**
   * Gets cached price from Realm KeyValue storage
   * Validates data and removes corrupted entries
   *
   * @param cacheKey - Cache key
   * @returns Cached price data or null
   */
  private static async getCachedPrice(cacheKey: string): Promise<HistoricalPriceData | null> {
    try {
      const realm = await BlueApp.openRealmKeyValue();
      const cached = realm.objects('KeyValue').filtered('key == $0', cacheKey)[0];

      if (cached && cached.value) {
        try {
          const parsed = JSON.parse(cached.value) as HistoricalPriceData;
          
          // Validate cached data structure
          if (
            parsed &&
            typeof parsed.price === 'number' &&
            !isNaN(parsed.price) &&
            isFinite(parsed.price) &&
            parsed.price > 0
          ) {
            return parsed;
          } else {
            // Corrupted data - remove it
            console.warn(`PriceService: Removing corrupted cache entry for ${cacheKey}`);
            realm.write(() => {
              realm.delete(cached);
            });
          }
        } catch (parseError) {
          // Invalid JSON - remove corrupted entry
          console.warn(`PriceService: Removing corrupted cache entry (invalid JSON) for ${cacheKey}:`, parseError);
          realm.write(() => {
            realm.delete(cached);
          });
        }
      }
    } catch (error) {
      console.error('Error reading cached price:', error);
    }

    return null;
  }

  /**
   * Caches price in Realm KeyValue storage
   *
   * @param cacheKey - Cache key
   * @param price - Price to cache
   * @param isEstimated - Whether price is estimated
   */
  private static async cachePrice(cacheKey: string, price: number, isEstimated: boolean): Promise<void> {
    try {
      const realm = await BlueApp.openRealmKeyValue();
      const data: HistoricalPriceData = {
        price,
        lastUpdated: Date.now(),
        isEstimated,
      };

      BlueApp.saveToRealmKeyValue(realm, cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error caching price:', error);
    }
  }

  /**
   * Generates cache key for a date and currency
   *
   * @param date - Date
   * @param currency - Currency code
   * @returns Cache key string
   */
  private static getCacheKey(date: Date, currency: string): string {
    const dateStr = this.formatDate(date);
    return `${this.CACHE_KEY_PREFIX}${dateStr}_${currency.toUpperCase()}`;
  }

  /**
   * Formats date as YYYY-MM-DD
   *
   * @param date - Date to format
   * @returns Formatted date string
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formats date for CoinGecko API (DD-MM-YYYY)
   *
   * @param date - Date to format
   * @returns Formatted date string for CoinGecko
   */
  private static formatDateForCoinGecko(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Implements rate limiting for CoinGecko API
   * Free tier allows ~10-50 calls per minute
   */
  private static async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;

    if (timeSinceLastCall < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastCall));
    }

    this.lastApiCallTime = Date.now();
  }

  /**
   * Clears cached prices for a specific currency
   * Useful when currency changes
   *
   * @param currency - Currency code to clear
   */
  static async clearCurrencyCache(currency: string): Promise<void> {
    try {
      const realm = await BlueApp.openRealmKeyValue();
      const prefix = `${this.CACHE_KEY_PREFIX}`;
      const currencySuffix = `_${currency.toUpperCase()}`;
      const cached = realm.objects('KeyValue').filtered('key BEGINSWITH $0', prefix);

      realm.write(() => {
        for (const item of cached) {
          if (item.key.endsWith(currencySuffix)) {
            realm.delete(item);
          }
        }
      });
      console.log(`PriceService: Cleared cache for currency ${currency}`);
    } catch (error) {
      console.error('Error clearing currency cache:', error);
    }
  }

  /**
   * Clears all cached prices
   * Useful for fixing corrupted data or resetting cache
   */
  static async clearAllCache(): Promise<void> {
    try {
      const realm = await BlueApp.openRealmKeyValue();
      const prefix = `${this.CACHE_KEY_PREFIX}`;
      const cached = realm.objects('KeyValue').filtered('key BEGINSWITH $0', prefix);

      realm.write(() => {
        for (const item of cached) {
          realm.delete(item);
        }
      });
      console.log('PriceService: Cleared all price cache');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Validates and repairs cache by removing corrupted entries
   * Scans all cached prices and removes invalid entries
   *
   * @returns Number of corrupted entries removed
   */
  static async repairCache(): Promise<number> {
    let removedCount = 0;
    try {
      const realm = await BlueApp.openRealmKeyValue();
      const prefix = `${this.CACHE_KEY_PREFIX}`;
      const cached = realm.objects('KeyValue').filtered('key BEGINSWITH $0', prefix);
      const toDelete: any[] = [];

      // First pass: identify corrupted entries
      for (const item of cached) {
        if (!item.value) {
          toDelete.push(item);
          continue;
        }

        try {
          const parsed = JSON.parse(item.value) as HistoricalPriceData;
          
          // Validate structure
          if (
            !parsed ||
            typeof parsed.price !== 'number' ||
            isNaN(parsed.price) ||
            !isFinite(parsed.price) ||
            parsed.price <= 0
          ) {
            toDelete.push(item);
          }
        } catch (parseError) {
          // Invalid JSON
          toDelete.push(item);
        }
      }

      // Second pass: remove corrupted entries
      if (toDelete.length > 0) {
        realm.write(() => {
          for (const item of toDelete) {
            realm.delete(item);
            removedCount++;
          }
        });
        console.log(`PriceService: Repaired cache, removed ${removedCount} corrupted entries`);
      } else {
        console.log('PriceService: Cache validation passed, no corrupted entries found');
      }
    } catch (error) {
      console.error('Error repairing cache:', error);
    }

    return removedCount;
  }
}

