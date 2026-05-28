import React, { useState } from "react";
import { Stock, Position } from "../types";
import { Sparkles, Brain, Loader2, PlayCircle, HelpCircle } from "lucide-react";
import Markdown from "react-markdown";

interface AiInvestmentAdvisorProps {
  stock: Stock;
  currentPosition: Position | undefined;
}

export default function AiInvestmentAdvisor({ stock, currentPosition }: AiInvestmentAdvisorProps) {
  const [analysisText, setAnalysisText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const fetchAnalysis = async (query = "") => {
    setLoading(true);
    setErrorText(null);
    try {
      // Pick recent prices for representation
      const recentPrices = stock.kline.slice(-10).map((k) => ({
        date: k.time,
        close: k.close,
        volume: k.volume,
      }));

      const res = await fetch("/api/stock-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockName: stock.name,
          stockCode: stock.code,
          currentPrice: stock.price,
          changePercent: stock.changePercent,
          holdingsStatus: currentPosition
            ? `持仓 ${currentPosition.shares} 股，均价 ¥${currentPosition.costPrice}`
            : "未持仓",
          recentKLines: recentPrices,
          extraQuery: query || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAnalysisText(data.analysis);
      } else {
        setErrorText(data.error || "获取分析报告失败，请稍后重试。");
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("网络异常，未能连接到分析决策服务器。");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = (type: number) => {
    let q = "";
    if (type === 1) {
      q = "这只股票近期的技术图形是怎样的？属于多头排列还是空头排列？阻力位和支撑位在哪里？";
    } else if (type === 2) {
      q = "对该股票的当前买卖盘口深度（五档）和资金流向有何研判？如果主力拉长震荡周期，我应如何定投吸筹？";
    } else if (type === 3) {
      q = "如果我目前重仓被套，或者是想追高买入，资深首席分析师有什么样具体的仓位红线与分批退路设计？";
    }
    fetchAnalysis(q);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg" id="ai-advisor-panel">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-3.5 border-b border-zinc-850 pb-2">
        <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 animate-pulse">
          <Brain className="w-4 h-4 text-red-500" />
          AI 顶尖机构研报与深度诊断端
        </span>
        <span className="text-[10px] text-zinc-500">
          基于 ${stock.name} 盘口流、量化均线与K线进行运算
        </span>
      </div>

      {/* 2. Suggested Hot Prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleSuggest(1)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 font-bold rounded text-[10px] transition"
        >
          <Sparkles className="w-3 h-3 text-yellow-500" />
          多技术形态阻力位诊断
        </button>
        <button
          onClick={() => handleSuggest(2)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 font-bold rounded text-[10px] transition"
        >
          <Sparkles className="w-3 h-3 text-yellow-500" />
          五档深度与机构吸筹策略
        </button>
        <button
          onClick={() => handleSuggest(3)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 font-bold rounded text-[10px] transition"
        >
          <Sparkles className="w-3 h-3 text-yellow-500" />
          仓位控制红线与防线规划
        </button>
      </div>

      {/* 3. Output Box */}
      <div className="relative min-h-[140px] bg-zinc-900/40 rounded-xl p-4 border border-zinc-850/70">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-zinc-950/40 rounded-xl">
            <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
            <div className="text-xs text-zinc-400 font-medium font-sans">
              正在连线证券首席星链大模型，分析 {stock.name} 今日主力买卖账单...
            </div>
          </div>
        ) : null}

        {errorText && (
          <div className="p-3 bg-red-950/20 rounded border border-red-900/30 text-rose-400 text-xs mb-3">
            {errorText}
          </div>
        )}

        {analysisText ? (
          <div className="markdown-body text-xs text-zinc-300 leading-relaxed font-sans overflow-y-auto max-h-[350px] space-y-2.5 pr-1">
            <Markdown>{analysisText}</Markdown>
          </div>
        ) : (
          !loading && (
            <div className="py-8 text-center text-zinc-555 flex flex-col items-center justify-center gap-1.5">
              <Sparkles className="w-6 h-6 text-yellow-500/70" />
              <p className="text-xs text-zinc-400">目前暂无诊断数据。点击上方快捷按钮，或输入任何机构级疑惑，即可调取人工智能深度报告。</p>
            </div>
          )
        )}
      </div>

      {/* 4. Custom query text entry row */}
      <div className="mt-3.5 flex gap-2">
        <input
          type="text"
          placeholder={`询问AI对股票 ${stock.name} 的个性化诊断... 例如：如果下午跳水，我应该做T吗？`}
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customQuestion.trim()) {
              fetchAnalysis(customQuestion);
              setCustomQuestion("");
            }
          }}
          className="flex-1 bg-zinc-900 border border-zinc-800 placeholder-zinc-550 px-3.5 py-1.5 text-xs text-zinc-100 rounded-lg focus:outline-none focus:border-red-500/40"
        />
        <button
          onClick={() => {
            if (customQuestion.trim()) {
              fetchAnalysis(customQuestion);
              setCustomQuestion("");
            }
          }}
          disabled={loading || !customQuestion.trim()}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600 font-extrabold text-xs rounded-lg transition shrink-0 flex items-center gap-1 shadow"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          获取研报
        </button>
      </div>
    </div>
  );
}
