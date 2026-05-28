import { KLineData, DepthBook, DepthLevel, Stock } from "./types";

/**
 * Format helper for numbers
 */
export const formatNum = (value: number, decimalPlaces = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return "0.00";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};

/**
 * Format helpers for currency in millions/billions
 */
export const formatVolumeOrAmount = (value: number, isVolume = false): string => {
  if (value >= 1_0000_0000) {
    const formatted = value / 1_0000_0000;
    return `${formatNum(formatted, 2)}亿${isVolume ? "股" : "元"}`;
  } else if (value >= 10000) {
    const formatted = value / 10000;
    return `${formatNum(formatted, 2)}万${isVolume ? "股" : "元"}`;
  }
  return `${formatNum(value, 0)}${isVolume ? "股" : "元"}`;
};

/**
 * Calculate Moving Averages and MACD for rendering premium indicators
 */
export const calculateTechnicalIndicators = (kline: KLineData[]): KLineData[] => {
  if (!kline || kline.length === 0) return [];

  const result = [...kline];

  // 1. Moving Averages
  for (let i = 0; i < result.length; i++) {
    // MA5
    if (i >= 4) {
      let sum = 0;
      for (let j = 0; j < 5; j++) sum += result[i - j].close;
      result[i].ma5 = Number((sum / 5).toFixed(2));
    }
    // MA10
    if (i >= 9) {
      let sum = 0;
      for (let j = 0; j < 10; j++) sum += result[i - j].close;
      result[i].ma10 = Number((sum / 10).toFixed(2));
    }
    // MA20
    if (i >= 19) {
      let sum = 0;
      for (let j = 0; j < 20; j++) sum += result[i - j].close;
      result[i].ma20 = Number((sum / 20).toFixed(2));
    }
  }

  // 2. MACD (EMA12, EMA26, DIFF, DEA, HIST)
  let ema12 = result[0].close;
  let ema26 = result[0].close;
  let dea = 0;

  for (let i = 0; i < result.length; i++) {
    const close = result[i].close;
    if (i > 0) {
      ema12 = (close * 2) / 13 + (ema12 * 11) / 13;
      ema26 = (close * 2) / 27 + (ema26 * 25) / 27;
    }
    const diff = ema12 - ema26;
    if (i === 0) {
      dea = diff;
    } else {
      dea = (diff * 2) / 10 + (dea * 8) / 10;
    }
    const hist = 2 * (diff - dea);

    result[i].macd = {
      diff: Number(diff.toFixed(4)),
      dea: Number(dea.toFixed(4)),
      hist: Number(hist.toFixed(4)),
    };
  }

  return result;
};

/**
 * Generates highly realistic 60 days of historical K-Line data for given base price
 */
export const generateKLineData = (
  basePrice: number,
  volatility = 1.5,
  daysCount = 60
): KLineData[] => {
  const kline: KLineData[] = [];
  const startDay = new Date();
  startDay.setDate(startDay.getDate() - daysCount);

  let currentClose = basePrice * 0.9; // Start slightly lower so it drifts up to current

  // Stock price history generation with random walk
  for (let i = 0; i < daysCount; i++) {
    const currentDate = new Date(startDay);
    currentDate.setDate(startDay.getDate() + i);

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      continue;
    }

    const dateString = currentDate.toISOString().split("T")[0];

    // High fidelity random walk: daily price movement
    const changePercent = (Math.random() - 0.48) * 2 * (volatility / 100); // slight positive drift
    const open = currentClose;
    const close = Number((currentClose * (1 + changePercent)).toFixed(2));
    
    const amplitude = (Math.random() * (volatility / 100) + 0.005);
    const high = Number((Math.max(open, close) * (1 + amplitude)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - amplitude)).toFixed(2));

    // Base volume correlated with price volatility and base price
    const baseVolume = (1000000 / basePrice) * 100;
    const volume = Math.floor(baseVolume * (0.5 + Math.random() * 2));

    kline.push({
      time: dateString,
      open,
      close,
      high,
      low,
      volume,
    });

    currentClose = close;
  }

  // Adjust last item to fit the current live price precisely
  if (kline.length > 0) {
    const last = kline[kline.length - 1];
    const diff = basePrice - last.close;
    kline[kline.length - 1] = {
      ...last,
      close: basePrice,
      high: Number(Math.max(last.open, basePrice, last.high).toFixed(2)),
      low: Number(Math.min(last.open, basePrice, last.low).toFixed(2)),
    };
  }

  return calculateTechnicalIndicators(kline);
};

/**
 * Generates Level-2 High Integrity Market Depth (Buy 5, Sell 5) matching current price
 */
export const generateDepthBook = (currentPrice: number, volatility = 1.0): DepthBook => {
  const buy: DepthLevel[] = [];
  const sell: DepthLevel[] = [];
  
  // Base spread size, usually 1 or 2 cents (0.01 - 0.02)
  const priceStep = 0.01;

  // Generate Sell 5 (ascending from Sell 1 = currentPrice + step)
  for (let i = 1; i <= 5; i++) {
    const price = Number((currentPrice + i * priceStep).toFixed(2));
    // Simulated depth order sizes (typically smaller close to spread, or with randomized dense rows)
    const multiplier = 500 / currentPrice;
    const volume = Math.floor((Math.random() * 800 + 100) * multiplier * (6 - i));
    sell.push({ price, volume: volume > 0 ? volume : 10 });
  }

  // Generate Buy 5 (descending from Buy 1 = currentPrice - step)
  for (let i = 1; i <= 5; i++) {
    const price = Number((currentPrice - i * priceStep).toFixed(2));
    const multiplier = 500 / currentPrice;
    const volume = Math.floor((Math.random() * 800 + 100) * multiplier * (6 - i));
    buy.push({ price, volume: volume > 0 ? volume : 10 });
  }

  // Depth lists should be structured properly:
  // Sell List: Sell 5 is highest price (first index or last index).
  // Usually displayed from Sell 5 down to Sell 1 (Sell 5 top, Sell 1 bottom),
  // Buy 1 top down to Buy 5 bottom.
  // Buy 1-5 desc. Sell 1-5 asc.
  return {
    buy,
    sell,
    spread: Number((sell[0].price - buy[0].price).toFixed(2)),
  };
};

/**
 * Generates an active matching engine tick log (transaction stream)
 */
export interface TradeTick {
  time: string;
  price: number;
  volume: number; // in shares (multiples of 100 usually)
  type: 'BUY' | 'SELL';
}

export const generateRecentTicks = (currentPrice: number, count = 20): TradeTick[] => {
  const ticks: TradeTick[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const tickTime = new Date(now.getTime() - i * (Math.random() * 3000 + 1000));
    const timeStr = tickTime.toTimeString().split(" ")[0]; // HH:MM:SS
    
    // Slight noise around current price
    const spreadOffset = (Math.random() > 0.5 ? 0.01 : -0.01);
    const tickPrice = Number((currentPrice + (Math.random() > 0.75 ? spreadOffset : 0)).toFixed(2));
    
    ticks.push({
      time: timeStr,
      price: tickPrice,
      volume: Math.floor(Math.random() * 80 + 10) * 100, // Multiples of 100 shares
      type: Math.random() > 0.48 ? 'BUY' : 'SELL',
    });
  }

  return ticks;
};

/**
 * Validates stock code format (e.g. 6-digit number)
 */
export const isValidStockCode = (code: string): boolean => {
  return /^\d{6}$/.test(code) || /^[A-Z]{2,4}$/.test(code);
};

/**
 * Generate standard technical indicators commentary
 */
export const generateStatusIndicator = (stock: Stock): { text: string; color: string } => {
  const lastK = stock.kline[stock.kline.length - 1];
  const prevK = stock.kline[stock.kline.length - 2];
  
  if (!lastK || !prevK) return { text: "宽幅震荡", color: "text-gray-400" };

  const isUp = stock.changePercent > 0;
  const maCross = lastK.ma5 && lastK.ma10 ? lastK.ma5 > lastK.ma10 : false;
  const prevMaCross = prevK.ma5 && prevK.ma10 ? prevK.ma5 > prevK.ma10 : false;
  
  if (maCross && !prevMaCross && isUp) {
    return { text: "均线金叉 (买入信号)", color: "text-red-500 font-bold" };
  } else if (!maCross && prevMaCross && !isUp) {
    return { text: "均线死叉 (落袋为安)", color: "text-green-500 font-bold" };
  }

  if (lastK.macd && lastK.macd.hist > 0 && prevK.macd && prevK.macd.hist <= 0) {
    return { text: "MACD红柱初现 (动能转强)", color: "text-red-400" };
  }

  if (stock.changePercent >= 7.0) {
    return { text: "主力加速拉升", color: "text-red-600" };
  } else if (stock.changePercent <= -7.0) {
    return { text: "筹码恐慌踩踏", color: "text-green-600" };
  } else if (Math.abs(stock.changePercent) < 0.5) {
    return { text: "横盘筹码收集", color: "text-gray-400" };
  }

  return isUp ? { text: "高走偏强", color: "text-red-400" } : { text: "弱势盘整", color: "text-green-400" };
};
