import { Stock, IndexData } from "./types";
import { generateKLineData } from "./utils";

// Predefined hot stock list spanning core industries
export const INITIAL_SECTOR_STOCKS = [
  {
    code: "600519",
    name: "贵州茅台",
    price: 1680.50,
    prevClose: 1665.20,
    industry: "白酒饮料",
    volatility: 0.8,
  },
  {
    code: "300750",
    name: "宁德时代",
    price: 185.30,
    prevClose: 181.10,
    industry: "绿色电池",
    volatility: 1.8,
  },
  {
    code: "002594",
    name: "比亚迪",
    price: 256.40,
    prevClose: 261.20,
    industry: "新能源汽车",
    volatility: 1.6,
  },
  {
    code: "603019",
    name: "中科曙光",
    price: 52.80,
    prevClose: 49.30,
    industry: "AI算力服务器",
    volatility: 2.8,
  },
  {
    code: "002371",
    name: "北方华创",
    price: 320.15,
    prevClose: 315.00,
    industry: "半导体核心设备",
    volatility: 2.4,
  },
  {
    code: "600036",
    name: "招商银行",
    price: 31.85,
    prevClose: 31.90,
    industry: "零售银行",
    volatility: 0.7,
  },
  {
    code: "601318",
    name: "中国平安",
    price: 43.10,
    prevClose: 42.85,
    industry: "保险综合金融",
    volatility: 1.0,
  },
  {
    code: "603259",
    name: "药明康德",
    price: 48.95,
    prevClose: 50.10,
    industry: "CXO生物医药",
    volatility: 2.0,
  },
  {
    code: "000063",
    name: "中兴通讯",
    price: 26.75,
    prevClose: 26.35,
    industry: "5G通信及微电子",
    volatility: 1.5,
  }
];

// Indexes representing market health
export const getMarketIndexes = (): IndexData[] => [
  {
    name: "上证指数",
    code: "000001",
    price: 3124.65,
    changeValue: 12.45,
    changePercent: 0.40,
  },
  {
    name: "深证成指",
    code: "399001",
    price: 9545.20,
    changeValue: -45.10,
    changePercent: -0.47,
  },
  {
    name: "创业板指",
    code: "399006",
    price: 1823.15,
    changeValue: 11.82,
    changePercent: 0.65,
  }
];

/**
 * Builds standard stocks database with complete precompiled historical K-Line structures
 */
export const getPrefilledStocksList = (): Stock[] => {
  return INITIAL_SECTOR_STOCKS.map((s) => {
    // Generate 60 business days of records
    const klines = generateKLineData(s.price, s.volatility, 60);
    const lastK = klines[klines.length - 1];
    
    // Core parameters based on current and previous day close
    const changeValue = Number((s.price - s.prevClose).toFixed(2));
    const changePercent = Number(((changeValue / s.prevClose) * 100).toFixed(2));
    
    return {
      code: s.code,
      name: s.name,
      price: s.price,
      open: Number((s.prevClose * (0.99 + Math.random() * 0.02)).toFixed(2)),
      prevClose: s.prevClose,
      high: Number((Math.max(s.price, s.prevClose) * (1 + 0.01 * Math.random())).toFixed(2)),
      low: Number((Math.min(s.price, s.prevClose) * (1 - 0.01 * Math.random())).toFixed(2)),
      volume: Math.floor(Math.random() * 500000 + 100000) * 100, // in shares
      amount: Math.floor(Math.random() * 50_000_000 + 10_000_000), // in CYN
      changePercent,
      changeValue,
      kline: klines,
      industry: s.industry,
      volatility: s.volatility,
    };
  });
};

/**
 * Generate a new custom stock KLine history and baseline data for user-added assets
 */
export const createCustomStock = (
  code: string,
  name: string,
  initialPrice: number,
  industry: string,
  volatility = 1.8
): Stock => {
  const prevPrice = Number((initialPrice / (1 + (Math.random() - 0.5) * 0.04)).toFixed(2));
  const changeValue = Number((initialPrice - prevPrice).toFixed(2));
  const changePercent = Number(((changeValue / prevPrice) * 100).toFixed(2));
  
  const klines = generateKLineData(initialPrice, volatility, 60);

  return {
    code,
    name,
    price: initialPrice,
    open: Number((prevPrice * (0.99 + Math.random() * 0.02)).toFixed(2)),
    prevClose: prevPrice,
    high: Number((Math.max(initialPrice, prevPrice) * (1 + 0.01 * Math.random())).toFixed(2)),
    low: Number((Math.min(initialPrice, prevPrice) * (1 - 0.01 * Math.random())).toFixed(2)),
    volume: Math.floor(Math.random() * 200000 + 20000) * 100,
    amount: Math.floor(Math.random() * 10_000_000 + 2_000_000),
    changePercent,
    changeValue,
    kline: klines,
    industry,
    volatility,
    custom: true,
  };
};
