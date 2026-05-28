import React, { useState, useEffect } from "react";
import { Stock, Position, Transaction, IndexData } from "./types";
import { getPrefilledStocksList, getMarketIndexes, createCustomStock } from "./data";
import { formatNum, generateDepthBook } from "./utils";
import AccountSummary from "./components/AccountSummary";
import Watchlist from "./components/Watchlist";
import KLineChart from "./components/KLineChart";
import OrderBook from "./components/OrderBook";
import TradingForm from "./components/TradingForm";
import Holdings from "./components/Holdings";
import AiInvestmentAdvisor from "./components/AiInvestmentAdvisor";
import { TrendingUp, TrendingDown, BookOpen, Clock, RefreshCw } from "lucide-react";

export default function App() {
  // 1. Core States
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const [initialCash, setInitialCash] = useState<number>(1000000); // 1 Million Default
  const [availableCash, setAvailableCash] = useState<number>(1000000);
  const [holdings, setHoldings] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [autofillPrice, setAutofillPrice] = useState<number | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // 2. Load initially on mount (Sync with LocalStorage)
  useEffect(() => {
    // Clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString("zh-CN"));
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);

    // Load Local Data
    const savedInitial = localStorage.getItem("apex_initial_cash");
    const savedAvailable = localStorage.getItem("apex_available_cash");
    const savedHoldings = localStorage.getItem("apex_holdings");
    const savedTrans = localStorage.getItem("apex_transactions");
    const savedStocks = localStorage.getItem("apex_custom_stocks");

    let prefilledStocks = getPrefilledStocksList();
    if (savedStocks) {
      try {
        const parsed = JSON.parse(savedStocks) as Stock[];
        // Filter out duplicates and merge custom ones
        const customs = parsed.filter((p) => p.custom);
        prefilledStocks = [...prefilledStocks, ...customs];
      } catch (e) {
        console.error("Failed to restore custom watchlist", e);
      }
    }
    setStocks(prefilledStocks);
    setIndices(getMarketIndexes());

    // Fallback selection
    setSelectedStock(prefilledStocks[0]);

    if (savedInitial) setInitialCash(parseFloat(savedInitial));
    if (savedAvailable) setAvailableCash(parseFloat(savedAvailable));
    if (savedHoldings) {
      try {
        setHoldings(JSON.parse(savedHoldings));
      } catch (e) {
        console.error(e);
      }
    }
    if (savedTrans) {
      try {
        setTransactions(JSON.parse(savedTrans));
      } catch (e) {
        console.error(e);
      }
    }

    return () => clearInterval(clockTimer);
  }, []);

  // Write changes to localStorage incrementally
  useEffect(() => {
    if (stocks.length === 0) return;
    localStorage.setItem("apex_initial_cash", initialCash.toString());
    localStorage.setItem("apex_available_cash", availableCash.toString());
    localStorage.setItem("apex_holdings", JSON.stringify(holdings));
    localStorage.setItem("apex_transactions", JSON.stringify(transactions));
    
    const customStocks = stocks.filter((s) => s.custom);
    localStorage.setItem("apex_custom_stocks", JSON.stringify(customStocks));
  }, [initialCash, availableCash, holdings, transactions, stocks]);

  // 3. Dynamic Price Engine (Occasional Steps)
  useEffect(() => {
    if (stocks.length === 0) return;

    const engineTimer = setInterval(() => {
      setStocks((prevStocks) => {
        const nextStocks = prevStocks.map((s) => {
          // Volatility factor adjusts momentum
          const vol = s.volatility || 1.8;
          // Random drift between -1.4x to +1.6x of volatility (slight upward trend)
          const drift = (Math.random() - 0.47) * 2 * (vol / 100);
          
          const newPrice = Number((s.price * (1 + drift / 10)).toFixed(2));
          const changeValue = Number((newPrice - s.prevClose).toFixed(2));
          const changePercent = Number(((changeValue / s.prevClose) * 100).toFixed(2));

          // Sync last K-Line element
          const nextKline = [...s.kline];
          if (nextKline.length > 0) {
            const last = nextKline[nextKline.length - 1];
            nextKline[nextKline.length - 1] = {
              ...last,
              close: newPrice,
              high: Number(Math.max(last.high, newPrice).toFixed(2)),
              low: Number(Math.min(last.low, newPrice).toFixed(2)),
            };
          }

          return {
            ...s,
            price: newPrice,
            changeValue,
            changePercent,
            high: Number(Math.max(s.high, newPrice).toFixed(2)),
            low: Number(Math.min(s.low, newPrice).toFixed(2)),
            kline: nextKline,
          };
        });

        // Re-sync selected stock price reference
        if (selectedStock) {
          const matched = nextStocks.find((st) => st.code === selectedStock.code);
          if (matched) {
            setSelectedStock(matched);
          }
        }

        // Re-sync positions live price and valuation
        setHoldings((prevHoldings) =>
          prevHoldings.map((h) => {
            const liveStock = nextStocks.find((st) => st.code === h.code);
            if (!liveStock) return h;
            const marketValue = h.shares * liveStock.price;
            const unrealizedProfit = marketValue - h.totalCost;
            return {
              ...h,
              currentPrice: liveStock.price,
              marketValue,
              unrealizedProfit,
              unrealizedProfitPercent: h.totalCost > 0 ? (unrealizedProfit / h.totalCost) * 100 : 0,
            };
          })
        );

        return nextStocks;
      });

      // Marginally fluctuate market indices
      setIndices((prevIndices) =>
        prevIndices.map((ind) => {
          const change = (Math.random() - 0.5) * 0.001 * ind.price;
          const nextPrice = ind.price + change;
          const netChangeVal = ind.changeValue + change;
          // compute percent
          const startBase = ind.price - ind.changeValue;
          const nextPercent = (netChangeVal / startBase) * 100;
          return {
            ...ind,
            price: Number(nextPrice.toFixed(2)),
            changeValue: Number(netChangeVal.toFixed(2)),
            changePercent: Number(nextPercent.toFixed(2)),
          };
        })
      );

    }, 4500);

    return () => clearInterval(engineTimer);
  }, [stocks, selectedStock]);

  if (!selectedStock) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <span className="text-sm text-zinc-400">正在开启极速专业柜台交易端...</span>
        </div>
      </div>
    );
  }

  // 4. Executing Trades
  const handleTradeSubmit = (type: "BUY" | "SELL", price: number, shares: number) => {
    // Fee calculations
    const value = price * shares;
    const commission = Math.max(5, value * 0.0003); // Broker fee floor at 5 CNY
    const transferFee = value * 0.00002;
    const stampDuty = type === "SELL" ? value * 0.001 : 0;
    const totalFees = commission + transferFee + stampDuty;

    const totalCashChange = type === "BUY" ? value + totalFees : value - totalFees;

    if (type === "BUY") {
      setAvailableCash((prev) => prev - totalCashChange);

      setHoldings((prevHoldings) => {
        const existing = prevHoldings.find((h) => h.code === selectedStock.code);
        if (existing) {
          const newShares = existing.shares + shares;
          const newTotalCost = existing.totalCost + value;
          const newCostPrice = Number((newTotalCost / newShares).toFixed(2));
          const newMarketValue = newShares * selectedStock.price;
          const newUnrealized = newMarketValue - newTotalCost;

          return prevHoldings.map((h) =>
            h.code === selectedStock.code
              ? {
                  ...h,
                  shares: newShares,
                  costPrice: newCostPrice,
                  totalCost: newTotalCost,
                  marketValue: newMarketValue,
                  unrealizedProfit: newUnrealized,
                  unrealizedProfitPercent: (newUnrealized / newTotalCost) * 100,
                }
              : h
          );
        } else {
          return [
            ...prevHoldings,
            {
              code: selectedStock.code,
              name: selectedStock.name,
              shares,
              costPrice: price,
              currentPrice: selectedStock.price,
              marketValue: value,
              totalCost: value,
              unrealizedProfit: 0,
              unrealizedProfitPercent: 0,
            },
          ];
        }
      });
    } else {
      // SELL position
      const targetPos = holdings.find((h) => h.code === selectedStock.code);
      if (!targetPos) return;

      setAvailableCash((prev) => prev + totalCashChange);

      setHoldings((prevHoldings) => {
        const updated = prevHoldings.map((h) => {
          if (h.code !== selectedStock.code) return h;
          const remainingShares = h.shares - shares;
          if (remainingShares <= 0) return null;

          const proratedCost = (h.totalCost / h.shares) * remainingShares;
          const marketValue = remainingShares * selectedStock.price;
          const unrealizedProfit = marketValue - proratedCost;

          return {
            ...h,
            shares: remainingShares,
            totalCost: Number(proratedCost.toFixed(2)),
            marketValue,
            unrealizedProfit,
            unrealizedProfitPercent: proratedCost > 0 ? (unrealizedProfit / proratedCost) * 100 : 0,
          };
        });

        return updated.filter((item): item is Position => item !== null);
      });
    }

    // Append to transactions execution logger
    const transId = `TX-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
    const newTrans: Transaction = {
      id: transId,
      code: selectedStock.code,
      name: selectedStock.name,
      type,
      price,
      shares,
      amount: totalCashChange,
      time: new Date().toLocaleTimeString("zh-CN"),
    };
    setTransactions((prev) => [newTrans, ...prev]);
  };

  // 5. Account/Holdings Shortcuts
  const handleSellShortcut = (code: string, fraction: number) => {
    const pos = holdings.find((h) => h.code === code);
    if (!pos) return;
    
    // Resolve current live price from state index list safely
    const activeStock = stocks.find((s) => s.code === code);
    const livePrice = activeStock ? activeStock.price : pos.currentPrice;

    // A-Shares round lots count
    let targets = Math.floor((pos.shares * fraction) / 100) * 100;
    if (targets <= 0 && pos.shares > 0 && fraction === 1.0) {
      targets = pos.shares; // handle odd leftover lots if flat position
    } else if (targets <= 0) {
      alert("持仓数额太低，不满足一手（100股）交易基准！");
      return;
    }

    // Trigger internal trade logic
    const value = livePrice * targets;
    const commission = Math.max(5, value * 0.0003);
    const transferFee = value * 0.00002;
    const stampDuty = value * 0.001; // tax
    const totalFees = commission + transferFee + stampDuty;
    const receivedCash = value - totalFees;

    setAvailableCash((prev) => prev + receivedCash);

    setHoldings((prevHoldings) => {
      const updated = prevHoldings.map((h) => {
        if (h.code !== code) return h;
        const remainder = h.shares - targets;
        if (remainder <= 0) return null;

        const proratedCost = (h.totalCost / h.shares) * remainder;
        const marketVal = remainder * livePrice;
        const unrealized = marketVal - proratedCost;

        return {
          ...h,
          shares: remainder,
          totalCost: Number(proratedCost.toFixed(2)),
          marketValue: marketVal,
          unrealizedProfit: unrealized,
          unrealizedProfitPercent: proratedCost > 0 ? (unrealized / proratedCost) * 100 : 0,
        };
      });
      return updated.filter((item): item is Position => item !== null);
    });

    const transId = `TX-${Date.now().toString().slice(-6)}-F`;
    const newTrans: Transaction = {
      id: transId,
      code,
      name: pos.name,
      type: "SELL",
      price: livePrice,
      shares: targets,
      amount: receivedCash,
      time: new Date().toLocaleTimeString("zh-CN"),
    };
    setTransactions((prev) => [newTrans, ...prev]);
  };

  // Modify manual funding
  const handleUpdateCash = (newInitial: number, newAvailable: number) => {
    setInitialCash(newInitial);
    setAvailableCash(newAvailable);
  };

  // Add stock to watchlist
  const handleAddStock = (code: string, name: string, price: number, industry: string, volatility: number) => {
    const custom = createCustomStock(code, name, price, industry, volatility);
    setStocks((prev) => [custom, ...prev]);
    setSelectedStock(custom);
  };

  // Delete stock from watchlist
  const handleDeleteStock = (code: string) => {
    const updated = stocks.filter((s) => s.code !== code);
    setStocks(updated);
    if (selectedStock.code === code && updated.length > 0) {
      setSelectedStock(updated[0]);
    }
  };

  // Specific Stock Overwrites ("随时更换")
  const handleUpdateStockPrice = (code: string, newPrice: number, newName?: string) => {
    setStocks((prev) =>
      prev.map((s) => {
        if (s.code !== code) return s;
        const nameToUse = newName || s.name;
        const changeValue = Number((newPrice - s.prevClose).toFixed(2));
        const changePercent = Number(((changeValue / s.prevClose) * 100).toFixed(2));
        
        // Sync whole history curve
        const nextKline = [...s.kline];
        if (nextKline.length > 0) {
          const last = nextKline[nextKline.length - 1];
          nextKline[nextKline.length - 1] = {
            ...last,
            close: newPrice,
            high: Math.max(last.high, newPrice),
            low: Math.min(last.low, newPrice),
          };
        }

        return {
          ...s,
          name: nameToUse,
          price: newPrice,
          changeValue,
          changePercent,
          kline: nextKline,
        };
      })
    );
  };

  const totalMarketValue = holdings.reduce((sum, item) => sum + item.marketValue, 0);
  const matchedHolding = holdings.find((h) => h.code === selectedStock.code);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-yellow-500/30">
      
      {/* 1. Global Terminal Top-Rail Nav */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center shadow-md shadow-yellow-950/20">
              <div className="w-3.5 h-3.5 border-[2.5px] border-black rotate-45 font-bold"></div>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-wider flex items-center gap-2">
                <span className="text-yellow-500 text-sm tracking-tight font-black uppercase text-[15px]">PRO-TRADE</span>
                <span className="opacity-40 font-normal">|</span>
                领航者极速 A 股专业证券交易系统
                <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.2 rounded border border-yellow-500/20 font-bold">
                  PRO TERMINAL
                </span>
              </h1>
              <p className="text-[9px] text-zinc-450 font-mono leading-none mt-1">
                SECURE SANDBOX ENVIRONMENT / REALTIME PORTFOLIO MANAGER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-zinc-500 text-right">
              <div className="text-[9px] text-zinc-650">A股撮合成交阶段</div>
              <div className="text-[11px] text-zinc-450 font-bold flex items-center gap-1.5 justify-end">
                <Clock className="w-3.5 h-3.5 text-yellow-500" />
                {currentTimeStr || "--:--:--"}
              </div>
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-[10px] uppercase font-bold text-green-400">
              ● 仿真证券主总机已连接
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Terminal Panel Workspace Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4 flex flex-col">
        
        {/* Dynamic Balance Sheet Widget */}
        <AccountSummary
          availableCash={availableCash}
          marketValue={totalMarketValue}
          initialCash={initialCash}
          onUpdateCash={handleUpdateCash}
        />

        {/* Triple Grid Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
          
          {/* Left Watchlist: 3 Columns */}
          <section className="lg:col-span-3 h-[740px] flex flex-col">
            <Watchlist
              stocks={stocks}
              indices={indices}
              selectedStock={selectedStock}
              onSelectStock={setSelectedStock}
              onAddStock={handleAddStock}
              onDeleteStock={handleDeleteStock}
              onUpdateStockPrice={handleUpdateStockPrice}
            />
          </section>

          {/* Center Charting Engine: 6 Columns */}
          <section className="lg:col-span-6 space-y-4">
            <KLineChart stock={selectedStock} />
            <AiInvestmentAdvisor stock={selectedStock} currentPosition={matchedHolding} />
          </section>

          {/* Right Matching & Order Ticket: 3 Columns */}
          <section className="lg:col-span-3 space-y-4">
            <OrderBook
              stock={selectedStock}
              onPriceSelect={setAutofillPrice}
            />
            
            <TradingForm
              stock={selectedStock}
              availableCash={availableCash}
              currentPosition={matchedHolding}
              onTradeSubmit={handleTradeSubmit}
              autofillPrice={autofillPrice}
              clearAutofillPrice={() => setAutofillPrice(null)}
            />
          </section>
        </div>

        {/* Bottom Tab Layout: Holdings and Historical Matches */}
        <section className="pt-2">
          <Holdings
            holdings={holdings}
            transactions={transactions}
            onSellShortcut={handleSellShortcut}
            onClearHistory={() => setTransactions([])}
          />
        </section>
      </main>

      {/* Footer copyright */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-3 text-center text-[10px] text-zinc-600 font-mono mt-8">
        领航者证券极速集成系统 • 仿真柜台清算通道 v3.5 • 交易网点直连端口-3000 • 投资有风险 决策需谨慎
      </footer>
    </div>
  );
}
