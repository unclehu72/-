import React, { useState } from "react";
import { Position, Transaction } from "../types";
import { formatNum, formatVolumeOrAmount } from "../utils";
import { Briefcase, History, FileText, ArrowUpRight, ArrowDownLeft, Trash2, ShieldAlert } from "lucide-react";

interface HoldingsProps {
  holdings: Position[];
  transactions: Transaction[];
  onSellShortcut: (code: string, fraction: number) => void;
  onClearHistory: () => void;
}

export default function Holdings({
  holdings,
  transactions,
  onSellShortcut,
  onClearHistory,
}: HoldingsProps) {
  const [activeTab, setActiveTab] = useState<"HOLDINGS" | "TRANS" | "RULES">("HOLDINGS");

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg" id="portfolio-holdings-tabs">
      {/* 1. Navigation headers */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-1 flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("HOLDINGS")}
            className={`py-3 px-1 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "HOLDINGS"
                ? "border-red-500 text-red-500"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            现任持仓监控明细 ({holdings.length})
          </button>

          <button
            onClick={() => setActiveTab("TRANS")}
            className={`py-3 px-1 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "TRANS"
                ? "border-red-500 text-red-500"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            仿真通道历史成交日志 ({transactions.length})
          </button>

          <button
            onClick={() => setActiveTab("RULES")}
            className={`py-3 px-1 border-b-2 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "RULES"
                ? "border-red-500 text-red-500"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            仿真契约佣金费率表
          </button>
        </div>

        {activeTab === "TRANS" && transactions.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 bg-zinc-950/40 rounded border border-zinc-850 hover:border-red-950 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空日志
          </button>
        )}
      </div>

      {/* 2. Content Display Area */}
      <div className="p-4" id="portfolio-tab-content">
        {/* TAB 1: HOLDINGS PORTFOLIO */}
        {activeTab === "HOLDINGS" && (
          <div className="overflow-x-auto">
            {holdings.length === 0 ? (
              <div className="py-12 text-center text-zinc-555 flex flex-col items-center justify-center gap-2">
                <ShieldAlert className="w-8 h-8 text-zinc-600 animate-pulse" />
                <p className="text-xs text-zinc-500">目前您没有持有任何证券。请使用上方交易面板进行建仓买入！</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-sans min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-850 text-zinc-500 pb-3 text-[11px] font-bold">
                    <th className="py-2.5">证券简称/代码</th>
                    <th className="py-2.5">持仓股数</th>
                    <th className="py-2.5">买入成本价 (保本)</th>
                    <th className="py-2.5">最新现价</th>
                    <th className="py-2.5">参考证券市值</th>
                    <th className="py-2.5">持仓总盈亏金额</th>
                    <th className="py-2.5 text-right pr-4">极速一键快速换盘快捷操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-mono">
                  {holdings.map((p) => {
                    const isProfit = p.unrealizedProfit >= 0;
                    const profitColor = isProfit ? "text-red-500" : "text-green-500";
                    const profitSign = isProfit ? "+" : "";

                    return (
                      <tr key={p.code} className="hover:bg-zinc-900/30 transition group">
                        {/* Name/Code */}
                        <td className="py-3">
                          <div className="font-sans font-bold text-zinc-100">{p.name}</div>
                          <div className="text-[10px] text-zinc-400">{p.code}</div>
                        </td>

                        {/* Shares Owned */}
                        <td className="py-3 font-bold text-zinc-200">
                          {p.shares} <span className="text-[10px] text-zinc-500 font-normal">股</span>
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 text-zinc-300">
                          ¥ {formatNum(p.costPrice, 2)}
                        </td>

                        {/* Current Market Price */}
                        <td className="py-3 text-zinc-100 font-bold">
                          ¥ {formatNum(p.currentPrice, 2)}
                        </td>

                        {/* Market Value ratio */}
                        <td className="py-3 text-yellow-500/90 font-bold">
                          ¥ {formatNum(p.marketValue, 2)}
                        </td>

                        {/* Unreleased profit/losses */}
                        <td className={`py-3 ${profitColor} font-bold text-sm`}>
                          <span>{profitSign}{formatNum(p.unrealizedProfit, 2)}</span>
                          <span className="text-[10px] ml-1 font-semibold">
                            ({profitSign}{formatNum(p.unrealizedProfitPercent, 2)}%)
                          </span>
                        </td>

                        {/* Operational shortcuts */}
                        <td className="py-3 text-right pr-4">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                if (confirm(`确认要将持有的 ${p.name} 进行 [一键满仓平仓] 吗？`)) {
                                  onSellShortcut(p.code, 1.0);
                                }
                              }}
                              className="px-2.5 py-1 bg-green-950/40 hover:bg-green-600 hover:text-zinc-950 border border-green-800 hover:border-green-500 text-green-400 font-bold rounded text-[10px] transition"
                            >
                              一键平仓
                            </button>
                            <button
                              onClick={() => onSellShortcut(p.code, 0.5)}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-750 font-bold rounded text-[10px] transition"
                            >
                              快速减仓 50%
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: TRANSACTION HISTORY */}
        {activeTab === "TRANS" && (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1 flex flex-col justify-start">
            {transactions.length === 0 ? (
              <div className="py-12 text-center text-zinc-555">
                <p className="text-xs text-zinc-500">本交易阶段暂无成功报单成交。完成买卖，数据日志将自动写入此处归档。</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-850 text-zinc-500 pb-2 text-[11px] font-bold font-sans">
                    <th className="py-2.5">委托单流水ID</th>
                    <th className="py-2.5">成交时刻</th>
                    <th className="py-2.5">证券简称/代码</th>
                    <th className="py-2.5">交易委托流向</th>
                    <th className="py-2.5">成交兑现单价</th>
                    <th className="py-2.5">成交实得股量</th>
                    <th className="py-2.5 text-right pr-4">整体清结算流资</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-mono">
                  {transactions.map((t) => {
                    const isBuy = t.type === "BUY";
                    const flowColor = isBuy ? "text-red-500" : "text-green-500";
                    const flowBg = isBuy ? "bg-red-500/10" : "bg-green-500/10";
                    
                    return (
                      <tr key={t.id} className="hover:bg-zinc-900/20 transition">
                        {/* ID */}
                        <td className="py-2.5 text-zinc-500 text-[10px]">
                          {t.id}
                        </td>

                        {/* Timestamp */}
                        <td className="py-2.5 text-zinc-400">
                          {t.time}
                        </td>

                        {/* Ticker details */}
                        <td className="py-2.5">
                          <span className="font-sans font-bold text-zinc-300">{t.name}</span>
                          <span className="text-[10px] text-zinc-500 ml-1.5">{t.code}</span>
                        </td>

                        {/* Flow direction */}
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${flowColor} ${flowBg}`}>
                            {isBuy ? "证券买入建仓" : "证券卖出变现"}
                          </span>
                        </td>

                        {/* Fills prices */}
                        <td className="py-2.5 text-zinc-200">
                          ¥ {formatNum(t.price, 2)}
                        </td>

                        {/* Lot Size */}
                        <td className="py-2.5 text-zinc-150">
                          {t.shares} 股
                        </td>

                        {/* Total liquidity cost */}
                        <td className="py-2.5 text-right pr-4 font-bold text-zinc-300">
                          ¥ {formatNum(t.amount, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 3: COMMISSION FEE LAWS REFERENCE */}
        {activeTab === "RULES" && (
          <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-4 font-sans leading-relaxed">
            <h4 className="font-bold text-zinc-100 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-red-500 rounded-sm"></span>
              A股仿真核算交易成本规范手册
            </h4>
            
            <p>
              为了满足您对“<strong>精准计算各种盈亏</strong>
              ”的顶尖要求，本套仿真股票交易终端真实贯彻了以下费率清缴核算办法：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-zinc-300 mt-2">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                <div className="text-zinc-500 text-[10px] mb-1">1. 券商经纪人佣金 rate</div>
                <div className="font-bold">双边收取 0.03% (万分之三)</div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  单笔不足 5.00 元固定按最低 5.00 元起征收缴。
                </div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                <div className="text-zinc-500 text-[10px] mb-1">2. 印花税 Stamp Duty</div>
                <div className="font-bold text-zinc-200">单边收取 0.1% (千分之一)</div>
                <div className="text-[10px] text-green-500 mt-1 font-sans">
                  仅在您作为【证券卖方】完成变现交易时收取。买入免征。
                </div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                <div className="text-zinc-500 text-[10px] mb-1">3. 中央国结算过户费 Transfer Rate</div>
                <div className="font-bold">双边收取 0.002% (十万分之二)</div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  归集国家上海/深圳证券登记存管结算公司收讫。
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic mt-2">
              * 演算范例：
              <br />
              一、买入：买入贵州茅台 100 股，单价 1600.00 元，证券货值 160,000 元。过户费 3.2 元，佣金比率为 160,000 × 0.03% = 48 元。买入总成本契约实付：160,051.20 元。
              <br />
              二、卖出：卖出此 100 股，成交价格降至 1600.00 元，除双边佣金 48 元和过户费外，额外强制单向清缴 160,000 × 0.1% = 160.00 元印花税。卖出最终实收资金为：159,788.80 元。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
