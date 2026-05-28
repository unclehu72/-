import React, { useState, useEffect } from "react";
import { Stock, Position } from "../types";
import { formatNum } from "../utils";
import { ArrowUpRight, ArrowDownLeft, ShieldCheck, Calculator } from "lucide-react";

interface TradingFormProps {
  stock: Stock;
  availableCash: number;
  currentPosition: Position | undefined;
  onTradeSubmit: (type: "BUY" | "SELL", price: number, shares: number) => void;
  autofillPrice: number | null;
  clearAutofillPrice: () => void;
}

export default function TradingForm({
  stock,
  availableCash,
  currentPosition,
  onTradeSubmit,
  autofillPrice,
  clearAutofillPrice,
}: TradingFormProps) {
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [priceInput, setPriceInput] = useState(stock.price.toString());
  const [sharesInput, setSharesInput] = useState("");

  // Keep price input linked to active stock or clicked depth values
  useEffect(() => {
    if (autofillPrice !== null) {
      setPriceInput(autofillPrice.toString());
      clearAutofillPrice(); // Consume autofill
    } else {
      setPriceInput(stock.price.toString());
    }
  }, [stock.code, autofillPrice]);

  const price = parseFloat(priceInput) || 0;
  const shares = parseInt(sharesInput) || 0;

  // Exact exchange commission math:
  // Commission: 0.03% (Brokerage, floor at 5 CNY is common but we can stick to absolute percent)
  // Stamp duty (印花税): 0.1% ONLY applies when selling!
  // Transfer fee (过户费): 0.002%
  const brokerFeeRate = 0.0003; // 0.03%
  const transferFeeRate = 0.00002; // 0.002%
  const stampDutyRate = 0.001; // 0.1%

  // Buy overhead factor = 1 + brokerage fee
  const buyMultiplier = 1 + brokerFeeRate + transferFeeRate;
  
  // Max Shares to buy (rounded to nearest 100 shares standard lot size)
  const maxBuyShares = price > 0 ? Math.floor((availableCash / (price * buyMultiplier)) / 100) * 100 : 0;
  
  // Max Shares to sell owned in holding
  const maxSellShares = currentPosition ? currentPosition.shares : 0;

  const orderValue = price * shares;
  
  // Fees matching trade type
  let estimatedFees = 0;
  if (orderValue > 0) {
    const commission = Math.max(5, orderValue * brokerFeeRate); // A-share floor standard of 5元
    const transferFee = orderValue * transferFeeRate;
    const stampDuty = tradeType === "SELL" ? orderValue * stampDutyRate : 0;
    estimatedFees = commission + transferFee + stampDuty;
  }

  const estimatedTotal = tradeType === "BUY" ? orderValue + estimatedFees : orderValue - estimatedFees;

  const handlePositionFraction = (fraction: number) => {
    if (tradeType === "BUY") {
      const targetLots = Math.floor((maxBuyShares * fraction) / 100) * 100;
      setSharesInput(targetLots > 0 ? targetLots.toString() : "");
    } else {
      const targetLots = Math.floor((maxSellShares * fraction) / 100) * 100;
      setSharesInput(targetLots > 0 ? targetLots.toString() : "");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) {
      alert("请指定合理有效的委托报单价格！");
      return;
    }
    if (shares <= 0) {
      alert("请填写大于零的委托交易股数！");
      return;
    }
    if (shares % 100 !== 0) {
      alert("报单失败，仿真A股交易单笔必须为一手（100股）的整整数倍！");
      return;
    }

    if (tradeType === "BUY") {
      if (estimatedTotal > availableCash) {
        alert("账户可用资金不足！购买所需资金加上执行手续费超出您的余额上限。");
        return;
      }
    } else {
      if (shares > maxSellShares) {
        alert(`报单溢出，您目前对 ${stock.name} 仅持有 ${maxSellShares} 股仓位！`);
        return;
      }
    }

    onTradeSubmit(tradeType, price, shares);
    setSharesInput(""); // Clear quantity on successful trade
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col h-full shadow-lg" id="trading-desk-panel">
      {/* 1. Buy/Sell Tab Switches */}
      <div className="grid grid-cols-2 gap-2 mb-4" id="buy-sell-tab-switch">
        <button
          onClick={() => {
            setTradeType("BUY");
            setSharesInput("");
          }}
          className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            tradeType === "BUY"
              ? "bg-red-600 text-white shadow-md shadow-red-950/40"
              : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
          id="buy-action-tab"
        >
          <ArrowUpRight className="w-4 h-4" />
          买入建仓 (红单)
        </button>

        <button
          onClick={() => {
            setTradeType("SELL");
            setSharesInput("");
          }}
          className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            tradeType === "SELL"
              ? "bg-green-600 text-white shadow-md shadow-green-950/40"
              : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
          id="sell-action-tab"
        >
          <ArrowDownLeft className="w-4 h-4" />
          卖出减仓 (绿单)
        </button>
      </div>

      {/* 2. Primary Form Body */}
      <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
        {/* Price Row */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-zinc-400 font-medium">委托申报价 (CNY)</label>
            <span
              onClick={() => setPriceInput(stock.price.toString())}
              className="text-zinc-500 hover:text-white cursor-pointer transition text-[10px]"
            >
              自适应市价: ¥{stock.price}
            </span>
          </div>
          <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 focus-within:border-zinc-750 p-0.5">
            <button
              type="button"
              onClick={() => setPriceInput(Math.max(0.01, price - 0.01).toFixed(2))}
              className="px-3 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 font-bold transition rounded-md text-sm"
            >
              -
            </button>
            <input
              type="number"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="flex-1 bg-transparent px-3 py-1.5 text-center text-sm font-mono font-bold text-white focus:outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setPriceInput((price + 0.01).toFixed(2))}
              className="px-3 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 font-bold transition rounded-md text-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Quantity (Shares) Row */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-zinc-400 font-medium">委托报单量 (股)</label>
            <span className="text-zinc-500 font-mono text-[10px]">
              {tradeType === "BUY" ? `极大可买: ${maxBuyShares} 股` : `极大可卖: ${maxSellShares} 股`}
            </span>
          </div>
          <input
            type="number"
            placeholder="100股的倍数"
            step="100"
            value={sharesInput}
            onChange={(e) => setSharesInput(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-700 px-3 py-2 text-center text-sm font-mono font-bold text-white rounded-lg placeholder-zinc-550"
            required
          />
          <p className="text-[10px] text-zinc-500 mt-1.5 text-center">
            * 仿真柜台实行A股交易规则：单笔报单必须为 1手（100股）及整整数倍！
          </p>
        </div>

        {/* Position Fractions Shortcuts Matrix */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[0.25, 0.333, 0.5, 1.0].map((frac, i) => {
            const labels = ["1/4仓", "1/3仓", "半仓", "满仓"];
            return (
              <button
                key={i}
                type="button"
                onClick={() => handlePositionFraction(frac)}
                className="py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded font-medium border border-zinc-850/50 transition text-[10px]"
              >
                {labels[i]}
              </button>
            );
          })}
        </div>

        {/* 3. Executive Calculations Box */}
        <div className="border border-zinc-850 bg-zinc-900/10 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-zinc-450 text-[11px]">
            <span>证券账面价值</span>
            <span className="font-mono text-zinc-300">¥ {formatNum(orderValue, 2)}</span>
          </div>

          <div className="flex justify-between text-zinc-450 text-[11px] items-center">
            <span className="flex items-center gap-1">
              交易契约税费
              <span className="text-[9px] bg-zinc-800/80 text-zinc-500 px-1 py-0.2 rounded" title="佣金 0.03% (不足5元按5元计发) + 过户费 0.002% + 印花税 0.1%(仅卖方)">
                详
              </span>
            </span>
            <span className="font-mono text-zinc-400">¥ {formatNum(estimatedFees, 2)}</span>
          </div>

          <div className="border-t border-zinc-850/65 pt-2 flex justify-between items-center">
            <span className="text-zinc-300 font-bold">估算资金变动</span>
            <span className={`font-mono text-sm font-extrabold ${tradeType === "BUY" ? "text-red-400" : "text-green-400"}`}>
              {tradeType === "BUY" ? "-" : "+"} ¥ {formatNum(estimatedTotal, 2)}
            </span>
          </div>
        </div>

        {/* Submit Execution Trigger */}
        <button
          type="submit"
          className={`w-full py-2.5 rounded-lg text-xs font-black tracking-widest text-zinc-950 transition uppercase flex items-center justify-center gap-2 ${
            tradeType === "BUY"
              ? "bg-red-500 hover:bg-red-400 shadow-md shadow-red-950/20"
              : "bg-green-500 hover:bg-green-400 shadow-md shadow-green-950/20"
          }`}
          id="execute-trade-btn"
        >
          <ShieldCheck className="w-4 h-4" />
          确认提交极速通道委托书
        </button>
      </form>
    </div>
  );
}
