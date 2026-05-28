export interface KLineData {
  time: string; // YYYY-MM-DD
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number; // Volume of shares traded
  ma5?: number;
  ma10?: number;
  ma20?: number;
  macd?: {
    diff: number;
    dea: number;
    hist: number;
  };
}

export interface DepthLevel {
  price: number;
  volume: number; // Number of hands (100 shares each)
}

export interface DepthBook {
  buy: DepthLevel[];  // Size 5, buy orders (descending price)
  sell: DepthLevel[]; // Size 5, sell orders (ascending price)
  spread: number;     // Bid-Ask Spread
}

export interface Stock {
  code: string;         // e.g., 600519
  name: string;         // e.g., 贵州茅台
  price: number;        // Current market price
  open: number;
  prevClose: number;
  high: number;
  low: number;
  volume: number;       // Traded volume (shares)
  amount: number;       // Traded amount (CNY)
  changePercent: number; // Daily gain/loss %
  changeValue: number;   // Daily gain/loss CNY
  kline: KLineData[];
  industry: string;      // Industry sector name
  custom?: boolean;      // Created by user
  volatility?: number;   // Daily fluctuation factor (0.5 to 3.0)
}

export interface Position {
  code: string;
  name: string;
  shares: number;
  costPrice: number;    // Average price of purchases
  currentPrice: number;
  marketValue: number;  // shares * currentPrice
  totalCost: number;    // shares * costPrice
  unrealizedProfit: number; // marketValue - totalCost
  unrealizedProfitPercent: number; // (unrealizedProfit / totalCost) * 100
}

export interface Transaction {
  id: string;
  code: string;
  name: string;
  type: 'BUY' | 'SELL';
  price: number;
  shares: number;
  amount: number;       // price * shares
  time: string;         // HH:MM:SS
}

export interface IndexData {
  name: string;
  code: string;
  price: number;
  changeValue: number;
  changePercent: number;
}
