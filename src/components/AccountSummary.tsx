import React, { useState } from "react";
import { formatNum } from "../utils";
import { PlusCircle, Wallet, Settings } from "lucide-react";

interface AccountSummaryProps {
  availableCash: number;
  marketValue: number;
  initialCash: number;
  onUpdateCash: (newInitialCash: number, adjustCash: number) => void;
}

export default function AccountSummary({
  availableCash,
  marketValue,
  initialCash,
  onUpdateCash,
}: AccountSummaryProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [fundingAmount, setFundingAmount] = useState(initialCash.toString());
  const [adjustmentAmount, setAdjustmentAmount] = useState("");

  const totalAssets = availableCash + marketValue;
  const totalProfit = totalAssets - initialCash;
  const totalProfitPercent = initialCash > 0 ? (totalProfit / initialCash) * 100 : 0;

  const handleSetInitial = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(fundingAmount);
    if (!isNaN(parsed) && parsed > 0) {
      const difference = parsed - initialCash;
      onUpdateCash(parsed, availableCash + difference);
      setShowConfig(false);
    }
  };

  const handleAdjustCash = (type: "DEPOSIT" | "WITHDRAW") => {
    const amount = parseFloat(adjustmentAmount);
    if (!isNaN(amount) && amount > 0) {
      if (type === "WITHDRAW" && amount > availableCash) {
        alert("可用资金余额不足进行取款！");
        return;
      }
      const newInitial = type === "DEPOSIT" ? initialCash + amount : initialCash - amount;
      const newCash = type === "DEPOSIT" ? availableCash + amount : availableCash - amount;
      onUpdateCash(newInitial, newCash);
      setAdjustmentAmount("");
    }
  };

  const isProfit = totalProfit >= 0;
  const profitColor = totalProfit === 0 ? "text-gray-300" : isProfit ? "text-red-500" : "text-green-500";
  const profitBg = totalProfit === 0 ? "bg-zinc-800" : isProfit ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20";
  const profitSign = totalProfit > 0 ? "+" : "";

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg relative overflow-hidden" id="account-summary-panel">
      {/* Dynamic Background Effect */}
      <div className="absolute right-0 top-0 -mt-8 -mr-8 w-24 h-24 bg-zinc-800/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">账户总资本 (CNY)</div>
            <div className="text-xl md:text-2xl font-mono font-bold tracking-tight text-white flex items-center gap-2">
              ¥ {formatNum(totalAssets, 2)}
            </div>
          </div>
        </div>

        {/* Dynamic Profit display */}
        <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-end ${profitBg}`}>
          <span className="text-[10px] text-zinc-400 font-medium">累计盈亏 (收益率)</span>
          <span className={`font-mono font-bold text-sm md:text-base ${profitColor}`}>
            {profitSign}{formatNum(totalProfit, 2)} ({profitSign}{formatNum(totalProfitPercent, 2)}%)
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="border-l border-zinc-800 pl-4">
            <div className="text-xs text-zinc-400">可用资金 (现金)</div>
            <div className="font-mono mt-0.5 text-zinc-200 font-bold">¥ {formatNum(availableCash, 2)}</div>
          </div>

          <div className="border-l border-zinc-800 pl-4">
            <div className="text-xs text-zinc-400">持仓证券总市值</div>
            <div className="font-mono mt-0.5 text-zinc-200 font-bold">¥ {formatNum(marketValue, 2)}</div>
          </div>

          <div className="border-l border-zinc-800 pl-4">
            <div className="text-xs text-zinc-400">初始投放资本</div>
            <div className="font-mono mt-0.5 text-zinc-400">¥ {formatNum(initialCash, 2)}</div>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg text-xs transition duration-200"
            id="adjust-cash-btn"
          >
            <Settings className="w-3.5 h-3.5 text-yellow-500" />
            资金管理
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Direct Redefine Initial Base Cash */}
          <form onSubmit={handleSetInitial} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80">
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">重设全局初始资金 (直接重构账户基数):</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                placeholder="输入全新的初始资本金额"
                className="flex-1 bg-zinc-950 border border-zinc-850 px-3 py-1.5 text-sm text-white font-mono rounded focus:outline-none focus:border-yellow-500/50"
                required
              />
              <button
                type="submit"
                className="bg-yellow-600 hover:bg-yellow-500 text-zinc-950 font-bold text-xs px-3 py-1.5 rounded transition"
              >
                直接重设
              </button>
            </div>
          </form>

          {/* Quick Cash Inflow/Outflow */}
          <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80">
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">注入或追加可用本金 (实时充值/转账):</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="输入入金或出金数额"
                className="flex-1 bg-zinc-950 border border-zinc-850 px-3 py-1.5 text-sm text-white font-mono rounded focus:outline-none focus:border-yellow-500/50"
              />
              <button
                type="button"
                onClick={() => handleAdjustCash("DEPOSIT")}
                className="bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-400 font-bold text-xs px-2.5 py-1.5 rounded transition"
              >
                追加存入
              </button>
              <button
                type="button"
                onClick={() => handleAdjustCash("WITHDRAW")}
                className="bg-green-950/40 hover:bg-green-900/40 border border-green-500/30 text-green-400 font-bold text-xs px-2.5 py-1.5 rounded transition"
              >
                撤退出金
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
