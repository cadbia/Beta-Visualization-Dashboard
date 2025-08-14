interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
        }>;
      };
    }>;
  };
}

interface SPPriceData {
  date: string;
  price: number;
}

interface CombinedDataPoint {
  date: string;
  betaData: any;
  spPrice: number;
  spPriceZScore: number;
}

async function fetchSPPriceData(startDate: string, endDate: string): Promise<SPPriceData[]> {
  try {
    // Convert dates to Unix timestamps
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);
    
    // Yahoo Finance API endpoint for S&P 500 (^GSPC) via proxy
    const url = `/api/yahoo/v8/finance/chart/%5EGSPC?period1=${start}&period2=${end}&interval=1d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Yahoo Finance API returned status ${response.status} for date range ${startDate} to ${endDate}. This is normal for weekends/holidays.`);
      return [];
    }
    
    const data: YahooFinanceResponse = await response.json();
    
    if (!data.chart?.result?.[0]) {
      console.warn('No data returned from Yahoo Finance for date range', startDate, 'to', endDate);
      return [];
    }
    
    const result = data.chart.result[0];
    
    // Check if timestamps exist and is an array
    if (!result.timestamp || !Array.isArray(result.timestamp)) {
      console.warn('Invalid timestamp data from Yahoo Finance');
      return [];
    }
    
    // Check if quote data exists and is an array
    if (!result.indicators?.quote?.[0]?.close || !Array.isArray(result.indicators.quote[0].close)) {
      console.warn('Invalid quote data from Yahoo Finance');
      return [];
    }
    
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    const priceData: SPPriceData[] = timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      price: quotes.close[index] || 0
    })).filter(item => item.price > 0); // Filter out invalid prices
    
    return priceData;
    
  } catch (error) {
    console.warn('Network error fetching S&P 500 price data:', error);
    return [];
  }
}

function findClosestPrice(targetDate: string, priceData: SPPriceData[]): SPPriceData | null {
  const targetTime = new Date(targetDate).getTime();
  let closestPrice: SPPriceData | null = null;
  let minDaysDiff = Infinity;
  
  for (const pricePoint of priceData) {
    const priceTime = new Date(pricePoint.date).getTime();
    const daysDiff = Math.abs((targetTime - priceTime) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < minDaysDiff && daysDiff <= 7) {
      minDaysDiff = daysDiff;
      closestPrice = pricePoint;
    }
  }
  
  return closestPrice;
}

export function combineAndNormalizeBetaPrice(betaData: any[], priceMap: Map<string, SPPriceData>): {
  combinedData: CombinedDataPoint[];
  scaleFactor: number;
} {
  // Create combined dataset with closest price matches
  const combined: CombinedDataPoint[] = [];
  
  betaData.forEach(betaPoint => {
    const betaDate = new Date(betaPoint.date);
    let closestPrice: SPPriceData | null = null;
    let minDaysDiff = Infinity;
    
    // Find closest price date (within 7 days)
    priceMap.forEach(pricePoint => {
      const priceDate = new Date(pricePoint.date);
      const daysDiff = Math.abs((betaDate.getTime() - priceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < minDaysDiff && daysDiff <= 7) {
        minDaysDiff = daysDiff;
        closestPrice = pricePoint;
      }
    });
    
    if (closestPrice) {
      combined.push({
        date: betaPoint.date,
        betaData: betaPoint,
        spPrice: closestPrice.price,
        spPriceZScore: 0 // Will be calculated below
      });
    }
  });
  
  if (combined.length === 0) {
    return { combinedData: [], scaleFactor: 1 };
  }
  
  // Calculate z-score for S&P prices
  const prices = combined.map(d => d.spPrice);
  const priceMean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const priceStdDev = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - priceMean, 2), 0) / prices.length
  );
  
  // Apply z-score transformation with additional scale factor
  const scaleFactor = 0.3; // Shrink price data to better match beta scale
  combined.forEach(point => {
    point.spPriceZScore = ((point.spPrice - priceMean) / priceStdDev) * scaleFactor;
  });
  
  console.log(`Combined ${combined.length} data points`);
  console.log(`S&P Price Stats: Mean=${priceMean.toFixed(2)}, StdDev=${priceStdDev.toFixed(2)}`);
  console.log(`Scale Factor: ${scaleFactor}`);
  
  return { combinedData: combined, scaleFactor };
}
export async function fetchSPPriceForDates(dates: string[]): Promise<Map<string, SPPriceData>> {
  if (dates.length === 0) return new Map();
  
  console.log(`Fetching S&P 500 closing prices for ${dates.length} dates`);
  
  const priceMap = new Map<string, SPPriceData>();
  
  // Find the date range we need to fetch
  const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
  const minDate = new Date(sortedDates[0]);
  const maxDate = new Date(sortedDates[sortedDates.length - 1]);
  
  // Add buffer for fallback logic (7 days before and after)
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 7);
  
  const startDateStr = minDate.toISOString().split('T')[0];
  const endDateStr = maxDate.toISOString().split('T')[0];
  
  console.log(`Fetching S&P data from ${startDateStr} to ${endDateStr}`);
  
  // Make a single API call for the entire date range
  const allPriceData = await fetchSPPriceData(startDateStr, endDateStr);
  
  if (allPriceData.length === 0) {
    console.warn('No S&P price data retrieved for the requested date range');
    return priceMap;
  }
  
  console.log(`Retrieved ${allPriceData.length} S&P price data points`);
  
  // For each requested date, find the closest price within 7 days
  for (const date of dates) {
    const closestPrice = findClosestPrice(date, allPriceData);
    if (closestPrice) {
      const daysDiff = Math.abs((new Date(date).getTime() - new Date(closestPrice.date).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`${date}: Using price from ${closestPrice.date} (${Math.round(daysDiff)} days away): $${closestPrice.price.toFixed(2)}`);
      priceMap.set(date, closestPrice);
    } else {
      console.log(`${date}: No price data found within 7 days`);
    }
  }
  
  console.log(`Successfully matched ${priceMap.size} out of ${dates.length} requested dates`);
  return priceMap;
}