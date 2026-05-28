import React, { useState, useEffect } from "react";
import { Stock, DepthBook } from "../types";
import { formatNum, generateDepthBook, generateRecentTicks, TradeTick } from "../utils";
import { ListCollapse, RefreshCw, Hash } from "lucide-react";

interface OrderBookProps {
  stock: Stock;
  onPriceSelect: (price: number) => void;
}

export default function OrderBook({ stock, onPriceSelect }: OrderBookProps) {
  const [depth, setDepth] = useState<DepthBook | null>(null);
  const [ticks, setTicks] = useState<TradeTick[]>([]);

  // Regenerate depth book whenever stock selection changes or stock price updates
  useEffect(() => {
    setDepth(generateDepthBook(stock.price, stock.volatility));
    setTicks(generateRecentTicks(stock.price, 12));
  }, [stock.code, stock.price]);

  // Create active shimmery bidding ticker updates
  useEffect(() => {
    const timer = setInterval(() => {
      if (!depth) return;
      
      // Randomly adjust the volume sizes of depths or swap prices marginally
      const adjustLevels = (levels: { price: number; volume: number }[]) => {
        return levels.map((l) => {
          const sizeChange = (Math.random() - 0.5) * 40;
          return {
            price: l.price,
            volume: Math.max(10, Math.floor(l.volume + sizeChange)),
          };
        });
      };

      setDepth((prev) => {
        if (!prev) return null;
        return {
          buy: adjustLevels(prev.buy),
          sell: adjustLevels(prev.sell),
          spread: prev.spread,
        };
      });

      // Insert new matches to ticks log
      setTicks((prev) => {
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        const offset = (Math.random() - 0.5) * 0.04;
        const tickPrice = Number((stock.price + offset).toFixed(2));
        
        const newTick: TradeTick = {
          time: timeStr,
          price: tickPrice,
          volume: Math.floor(Math.random() * 45 + 5) * 100,
          type: Math.random() > 0.48 ? "BUY" : "SELL",
        };

        return [newTick, ...prev.slice(0, 11)];
      });

    }, 2200);

    return () => clearInterval(timer);
  }, [depth, stock.price]);

  if (!depth) return null;

  // Find max volume row to draw proportional width backgrounds
  const maxVol = Math.max(
    ...depth.sell.map((s) => s.volume),
    ...depth.buy.map((b) => b.volume)
  );

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col h-full shadow-lg" id="order-book-panel">
      {/* 1. Deck Header Info */}
      <div className="flex items-center justify-between mb-3 border-b border-zinc-850 pb-2">
        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
          <ListCollapse className="w-3.5 h-3.5 text-red-500" />
          Level-2 深度盘口
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md">
          撮合主通道
        </span>
      </div>

      {/* 2. Level 2 (Buy/Sell 1-5 Bids Grid) */}
      <div className="flex-1 space-y-2 text-xs">
        {/* SELL ORDERS S5 -> S1 (Rendered Top-down, Sell 5 at the top, Sell 1 at the bottom) */}
        <div className="space-y-1">
          {depth.sell.slice().reverse().map((s, index) => {
            const queueNum = 5 - index;
            const isLatest = queueNum === 1; // Sell 1
            const pcnOfMax = maxVol > 0 ? (s.volume / maxVol) * 100 : 0;
            
            return (
              <div
                key={`sell-${queueNum}`}
                onClick={() => onPriceSelect(s.price)}
                className="relative py-1 px-1.5 flex justify-between items-center hover:bg-zinc-900/60 transition cursor-pointer select-none rounded overflow-hidden"
                style={{ contentVisibility: "auto" }}
              >
                {/* Visual order weight bar overlay on background */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-green-500/5 transition-all duration-300 pointer-events-none"
                  style={{ width: `${pcnOfMax}%` }}
                ></div>

                <div className="flex items-center gap-3 z-10">
                  <span className="text-[10px] font-bold text-zinc-500 font-mono">卖{queueNum}</span>
                  <span className={`font-mono font-bold ${isLatest ? "text-green-400" : "text-green-500/85"}`}>
                    {formatNum(s.price, 2)}
                  </span>
                </div>
                <div className="z-10 font-mono text-zinc-450 text-[11px]">
                  {s.volume}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Bid-Ask Midpoint & Spread Band */}
        <div className="py-1.5 px-1.5 border-y border-zinc-850/60 bg-zinc-900/40 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">最新底价:</span>
            <span className={`font-bold ${stock.changePercent >= 0 ? "text-red-500" : "text-green-500"}`}>
              {formatNum(stock.price, 2)}
            </span>
          </div>
          <div className="text-[10px] text-zinc-500">
            点差: <span className="text-zinc-400 font-bold">{depth.spread} CNY</span>
          </div>
        </div>

        {/* BUY ORDERS B1 -> B5 (Rendered Top-down, Buy 1 first, Buy 5 last) */}
        <div className="space-y-1">
          {depth.buy.map((b, index) => {
            const queueNum = index + 1;
            const isLatest = queueNum === 1; // Buy 1
            const pcnOfMax = maxVol > 0 ? (b.volume / maxVol) * 100 : 0;

            return (
              <div
                key={`buy-${queueNum}`}
                onClick={() => onPriceSelect(b.price)}
                className="relative py-1 px-1.5 flex justify-between items-center hover:bg-zinc-900/60 transition cursor-pointer select-none rounded overflow-hidden"
              >
                {/* Visual weight bar overlay */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-500/5 transition-all duration-300 pointer-events-none"
                  style={{ width: `${pcnOfMax}%` }}
                ></div>

                <div className="flex items-center gap-3 z-10">
                  <span className="text-[10px] font-bold text-zinc-500 font-mono">买{queueNum}</span>
                  <span className={`font-mono font-bold ${isLatest ? "text-red-400" : "text-red-500/85"}`}>
                    {formatNum(b.price, 2)}
                  </span>
                </div>
                <div className="z-10 font-mono text-zinc-450 text-[11px]">
                  {b.volume}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. matching Execution Log ticks (最近明细) */}
      <div className="mt-4 border-t border-zinc-850/60 pt-3 h-[210px] flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2">
          <span className="font-bold flex items-center gap-1">
            <Hash className="w-3 h-3 text-yellow-500" />
            成交逐笔明细
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            极速直连
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] pr-1">
          {ticks.map((t, i) => {
            const isBuy = t.type === "BUY";
            const typeColor = isBuy ? "text-red-500" : "text-green-500";
            const tagBg = isBuy ? "bg-red-500/10" : "bg-green-500/10";
            
            return (
              <div key={i} className="flex justify-between items-center py-0.5 px-1 hover:bg-zinc-900 rounded">
                <span className="text-zinc-500">{t.time}</span>
                <span className={`font-bold ${typeColor}`}>
                  {formatNum(t.price, 2)}
                </span>
                <span className="text-zinc-300">{t.volume / 100}手</span>
                <span className={`px-1 py-0.2 rounded font-bold uppercase text-[8px] ${typeColor} ${tagBg}`}>
                  {isBuy ? "外盘" : "内盘"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
