import React, { useState } from "react";
import { Stock, IndexData } from "../types";
import { formatNum, isValidStockCode } from "../utils";
import { Search, Plus, Trash2, Edit3, Check, X, TrendingUp, TrendingDown } from "lucide-react";

interface WatchlistProps {
  stocks: Stock[];
  indices: IndexData[];
  selectedStock: Stock;
  onSelectStock: (stock: Stock) => void;
  onAddStock: (code: string, name: string, price: number, industry: string, volatility: number) => void;
  onDeleteStock: (code: string) => void;
  onUpdateStockPrice: (code: string, newPrice: number, newName?: string) => void;
}

export default function Watchlist({
  stocks,
  indices,
  selectedStock,
  onSelectStock,
  onAddStock,
  onDeleteStock,
  onUpdateStockPrice,
}: WatchlistProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Custom stock state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newIndustry, setNewIndustry] = useState("软件集成");
  const [newVol, setNewVol] = useState("1.8");

  // Editing stock state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [editingName, setEditingName] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidStockCode(newCode)) {
      alert("请输入有效的6位数字股票代码！");
      return;
    }
    if (stocks.find((s) => s.code === newCode)) {
      alert("该股票代码已存在于列表中！");
      return;
    }
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("请输入正确的股票初始定价！");
      return;
    }
    onAddStock(
      newCode,
      newName || `定制股-${newCode}`,
      parsedPrice,
      newIndustry,
      parseFloat(newVol) || 1.8
    );
    // Reset state
    setNewCode("");
    setNewName("");
    setNewPrice("");
    setShowAddForm(false);
  };

  const startEditing = (e: React.MouseEvent, stock: Stock) => {
    e.stopPropagation();
    setEditingCode(stock.code);
    setEditingPrice(stock.price.toString());
    setEditingName(stock.name);
  };

  const saveEditing = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const parsedPrice = parseFloat(editingPrice);
    if (!isNaN(parsedPrice) && parsedPrice > 0) {
      onUpdateStockPrice(code, parsedPrice, editingName);
      setEditingCode(null);
    } else {
      alert("请输入合法的交易价格！");
    }
  };

  const filteredStocks = stocks.filter((s) => {
    const rawSearch = searchTerm.toLowerCase();
    return s.code.includes(rawSearch) || s.name.toLowerCase().includes(rawSearch) || s.industry.toLowerCase().includes(rawSearch);
  });

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-lg" id="watchlist-panel">
      
      {/* 1. Market Indices Band */}
      <div className="grid grid-cols-3 gap-2 mb-4 border-b border-zinc-850 pb-3" id="market-indices-band">
        {indices.map((idx) => {
          const isUp = idx.changeValue >= 0;
          const arrowSymbol = isUp ? "▲" : "▼";
          const colorClass = isUp ? "text-red-500" : "text-green-500";
          const bgClass = isUp ? "bg-red-500/5 border-red-500/10" : "bg-green-500/5 border-green-500/10";
          
          return (
            <div key={idx.code} className={`p-2 rounded border ${bgClass} text-center flex flex-col justify-center`}>
              <div className="text-[11px] text-zinc-400 font-medium truncate">{idx.name}</div>
              <div className="font-mono text-sm font-bold text-zinc-100 mt-0.5">
                {formatNum(idx.price, 2)}
              </div>
              <div className={`font-mono text-[10px] mt-0.5 flex items-center justify-center gap-0.5 ${colorClass}`}>
                <span>{arrowSymbol}</span>
                <span>{isUp ? "+" : ""}{formatNum(idx.changePercent, 2)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Search & Headers */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <label className="text-xs text-zinc-400 font-bold tracking-wider uppercase">自选证券中心</label>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 px-2.5 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded text-[11px] font-bold flex items-center gap-1 transition"
          id="toggle-add-stock-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          设计新个股
        </button>
      </div>

      {/* Dynamic Add Stock Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-3 animate-fade-in text-xs space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-zinc-450 mb-0.5">股票代码 (6位):</label>
              <input
                type="text"
                placeholder="600888"
                maxLength={6}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white font-mono"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-zinc-450 mb-0.5">股票简称:</label>
              <input
                type="text"
                placeholder="极光星云"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white"
                required
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-zinc-450 mb-0.5">首发指导价:</label>
              <input
                type="number"
                step="0.01"
                placeholder="10.00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white font-mono"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-zinc-450 mb-0.5">波动偏好:</label>
              <select
                value={newVol}
                onChange={(e) => setNewVol(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white font-mono"
              >
                <option value="0.8">0.8% (绩优权重)</option>
                <option value="1.8">1.8% (稳健中盘)</option>
                <option value="2.8">2.8% (科技弹性)</option>
                <option value="4.5">4.5% (游资重组)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1.5">
            <div className="flex-1">
              <input
                type="text"
                placeholder="所属概念行业 (e.g. 芯片半导体)"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white"
              />
            </div>
            <button
              type="submit"
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 rounded transition"
            >
              录入上市
            </button>
          </div>
        </form>
      )}

      {/* Stock Ticker Filter Search BOX */}
      <div className="relative mb-3">
        <span className="absolute left-2.5 top-2.5 text-zinc-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="搜索个股简称/代码/所属行业"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-800 pl-9 pr-4 py-2 text-xs rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/40"
        />
      </div>

      {/* 3. Watchlist Items List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-sans text-xs scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredStocks.map((s) => {
          const isSelected = selectedStock.code === s.code;
          const isUp = s.changePercent >= 0;
          const priceColor = isUp ? "text-red-500" : "text-green-500";
          const percentBg = isUp ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500";
          const isEditing = editingCode === s.code;

          return (
            <div
              key={s.code}
              onClick={() => !isEditing && onSelectStock(s)}
              className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between group relative overflow-hidden ${
                isSelected
                  ? "bg-zinc-900 border-zinc-700 shadow-md"
                  : "bg-zinc-900/40 border-zinc-850/60 hover:bg-zinc-900 hover:border-zinc-800"
              }`}
            >
              {/* Highlight selection marker */}
              {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>}

              <div className="space-y-0.5">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setNewName(e.target.value)} // Re-using state temp
                      onBlur={() => setEditingName(editingName)}
                      className="bg-zinc-950 border border-zinc-800 px-1 py-0.5 text-white max-w-[80px]"
                    />
                  </div>
                ) : (
                  <div className="font-bold text-zinc-100 group-hover:text-white flex items-center gap-1.5">
                    {s.name}
                    <span className="text-[9px] bg-zinc-800 px-1 py-0.2 rounded text-zinc-400 font-normal">
                      {s.industry}
                    </span>
                  </div>
                )}
                <div className="text-[10px] font-mono text-zinc-400">{s.code}</div>
              </div>

              <div className="flex items-center gap-3">
                {/* Real-time updating display */}
                <div className="text-right space-y-0.5 min-w-[70px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        step="0.01"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 p-0.5 text-xs text-white font-mono text-right max-w-[65px]"
                      />
                    </div>
                  ) : (
                    <div className={`font-mono font-bold ${priceColor}`}>
                      ¥{formatNum(s.price, 2)}
                    </div>
                  )}
                  {!isEditing && (
                    <div className="font-mono text-[10px] text-zinc-500">
                      昨收 ¥{formatNum(s.prevClose, 2)}
                    </div>
                  )}
                </div>

                {/* Return values indicator badge */}
                {isEditing ? (
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => saveEditing(e, s.code)}
                      className="p-1 bg-green-950 hover:bg-green-900 border border-green-700/50 text-green-400 rounded"
                      title="保存修改"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCode(null);
                      }}
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 rounded"
                      title="取消"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-1 rounded font-mono font-bold text-[11px] text-right min-w-[62px] inline-block ${percentBg}`}>
                      {isUp ? "+" : ""}{formatNum(s.changePercent, 2)}%
                    </span>

                    {/* Operational edit / delete hover tools */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 absolute right-2.5 top-0 bottom-0 my-auto h-7 bg-zinc-900 pl-1">
                      <button
                        onClick={(e) => startEditing(e, s)}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
                        title="随时更换: 修改名称或设定价格"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确认将股票 ${s.name} (${s.code}) 移出交易监控终端？`)) {
                            onDeleteStock(s.code);
                          }
                        }}
                        className="p-1 hover:bg-red-950 text-zinc-400 hover:text-red-400 rounded"
                        title="删除自选个股"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
