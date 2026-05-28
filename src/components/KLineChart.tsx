import React, { useState, useRef, useEffect } from "react";
import { Stock, KLineData } from "../types";
import { formatNum, formatVolumeOrAmount, generateStatusIndicator } from "../utils";
import { TrendingUp, TrendingDown, Eye, Activity, Calendar } from "lucide-react";

interface KLineChartProps {
  stock: Stock;
}

export default function KLineChart({ stock }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 680, height: 380 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [viewIndicator, setViewIndicator] = useState<"MA" | "MACD" | "BOTH">("BOTH");

  // Keep responsive coordinates
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: Math.max(height, 350),
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const klines = stock.kline;
  const recentKLines = klines.slice(-40); // Show last 40 days

  // Compute maximums/minimums of the window
  let maxPrice = -Infinity;
  let minPrice = Infinity;
  let maxVol = 0;
  let maxMacd = 0.0001;

  recentKLines.forEach((k) => {
    // Candle boundaries
    maxPrice = Math.max(maxPrice, k.high, k.ma5 || 0, k.ma10 || 0, k.ma20 || 0);
    minPrice = Math.min(minPrice, k.low, k.ma5 || Infinity, k.ma10 || Infinity, k.ma20 || Infinity);
    // Vol
    maxVol = Math.max(maxVol, k.volume);
    // MACD
    if (k.macd) {
      maxMacd = Math.max(maxMacd, Math.abs(k.macd.diff), Math.abs(k.macd.dea), Math.abs(k.macd.hist));
    }
  });

  // Safe offset
  const priceRange = maxPrice - minPrice;
  maxPrice += priceRange * 0.05;
  minPrice -= priceRange * 0.05;

  // Dimensions subdivisions
  const width = dimensions.width;
  const totalHeight = dimensions.height;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 20;
  const paddingBottom = 25;

  // Render panes
  const chartWidth = width - paddingLeft - paddingRight;
  const mainChartHeight = totalHeight * 0.52; // 52% of space for candles
  const volChartHeight = totalHeight * 0.16;  // 16% for volumes
  const macdChartHeight = totalHeight * 0.16; // 16% for macd
  const gap = 15;

  const volYStart = paddingTop + mainChartHeight + gap;
  const macdYStart = volYStart + volChartHeight + gap;

  // Generators for coordinate conversion
  const getX = (index: number) => paddingLeft + (index / (recentKLines.length - 1)) * chartWidth;
  const getY = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return paddingTop + mainChartHeight * (1 - ratio);
  };
  const getVolY = (vol: number) => {
    const ratio = vol / maxVol;
    return volYStart + volChartHeight * (1 - ratio);
  };
  const getMacdY = (val: number) => {
    // Midpoint baseline mapping
    const midY = macdYStart + macdChartHeight / 2;
    const ratio = val / maxMacd; // goes from -1 to 1 theoretical range inside this window
    return midY - (macdChartHeight / 2) * ratio;
  };

  // Generate curves Paths
  const buildLinePath = (attrGetter: (k: KLineData) => number | undefined) => {
    const points: string[] = [];
    recentKLines.forEach((k, i) => {
      const val = attrGetter(k);
      if (val !== undefined && !isNaN(val)) {
        points.push(`${getX(i)},${getY(val)}`);
      }
    });
    return points.length > 0 ? `M ${points.join(" L ")}` : "";
  };

  const buildMacdPath = (attrGetter: (k: KLineData) => number | undefined) => {
    const points: string[] = [];
    recentKLines.forEach((k, i) => {
      const val = attrGetter(k);
      if (val !== undefined && !isNaN(val)) {
        points.push(`${getX(i)},${getMacdY(val)}`);
      }
    });
    return points.length > 0 ? `M ${points.join(" L ")}` : "";
  };

  const ma5Path = buildLinePath((k) => k.ma5);
  const ma10Path = buildLinePath((k) => k.ma10);
  const ma20Path = buildLinePath((k) => k.ma20);

  const diffPath = buildMacdPath((k) => k.macd?.diff);
  const deaPath = buildMacdPath((k) => k.macd?.dea);

  // Hover detection index calculation
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = e.clientX - rect.left - paddingLeft;
    if (xPos < 0 || xPos > chartWidth) {
      setHoverIndex(null);
      return;
    }
    const pct = xPos / chartWidth;
    let idx = Math.round(pct * (recentKLines.length - 1));
    idx = Math.max(0, Math.min(recentKLines.length - 1, idx));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Render info for Hover or Current Active
  const targetIndex = hoverIndex !== null ? hoverIndex : recentKLines.length - 1;
  const currentK = recentKLines[targetIndex];

  const upColor = "text-red-500";
  const downColor = "text-green-500";
  const activeColor = stock.changePercent >= 0 ? upColor : downColor;

  const diagnosis = generateStatusIndicator(stock);

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col h-full shadow-lg" id="candlestick-chart-panel">
      {/* 1. Header Information Grid */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-850 pb-3" id="active-ticker-hud">
        <div className="flex items-center gap-2.5">
          <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg text-rose-500">
            <Activity className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-white">{stock.name}</span>
              <span className="text-xs font-mono px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded-md">
                {stock.code}
              </span>
              <span className="text-[10px] bg-red-950/40 text-red-400 px-1.5 py-0.2 rounded border border-red-500/20">
                双向仿真级个股
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
              <span>行业：{stock.industry}</span>
              <span>•</span>
              <span className={diagnosis.color}>{diagnosis.text}</span>
            </div>
          </div>
        </div>

        {/* Real-time stats ticker overlay */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-1 md:mt-0 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-zinc-500">最新收盘价</div>
            <div className={`font-mono text-lg font-bold ${activeColor}`}>
              ¥ {formatNum(stock.price, 2)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-zinc-500">今日涨跌幅</div>
            <div className={`font-mono text-sm font-bold ${activeColor}`}>
              {stock.changePercent >= 0 ? "+" : ""}{formatNum(stock.changePercent, 2)}%
            </div>
          </div>

          <div className="border-l border-zinc-900 pl-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500">今开：</span>
                <span className={stock.open >= stock.prevClose ? "text-red-500" : "text-green-500"}>
                  {formatNum(stock.open, 2)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">昨收：</span>
                <span className="text-zinc-300">{formatNum(stock.prevClose, 2)}</span>
              </div>
              <div>
                <span className="text-zinc-500">最高：</span>
                <span className="text-red-500">{formatNum(stock.high, 2)}</span>
              </div>
              <div>
                <span className="text-zinc-500">最低：</span>
                <span className="text-green-500">{formatNum(stock.low, 2)}</span>
              </div>
            </div>
          </div>

          <div className="border-l border-zinc-900 pl-3">
            <div className="grid grid-cols-1 gap-y-1 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500">成交量：</span>
                <span className="text-zinc-300">{formatVolumeOrAmount(stock.volume / 100, true)}</span>
              </div>
              <div>
                <span className="text-zinc-500">成交额：</span>
                <span className="text-zinc-400">{formatVolumeOrAmount(stock.amount, false)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Tooltip Panel for Hovering Days */}
      <div className="bg-zinc-900/40 border border-zinc-850 p-2.5 rounded-lg mb-2 text-xs grid grid-cols-2 lg:grid-cols-5 gap-3 font-mono" id="chart-indicator-strip">
        <div>
          <span className="text-zinc-500 mr-2 flex items-center gap-1 inline-block">
            <Calendar className="w-3.5 h-3.5 inline text-zinc-500" />
            时间:
          </span>
          <span className="text-zinc-200 font-bold">{currentK.time}</span>
        </div>
        <div>
          <span className="text-zinc-500 mr-1">开/收:</span>
          <span className={currentK.close >= currentK.open ? "text-red-500" : "text-green-500"}>
            {formatNum(currentK.open, 2)}
          </span>
          <span className="text-zinc-400 mx-1">/</span>
          <span className={currentK.close >= currentK.open ? "text-red-500" : "text-green-500"}>
            {formatNum(currentK.close, 2)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 mr-1">高/低:</span>
          <span className="text-red-500">{formatNum(currentK.high, 2)}</span>
          <span className="text-zinc-400 mx-1">/</span>
          <span className="text-green-500">{formatNum(currentK.low, 2)}</span>
        </div>
        <div>
          <span className="text-zinc-500 mr-1">成交:</span>
          <span className="text-yellow-500">{formatVolumeOrAmount(currentK.volume / 100, true)}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-purple-400 border border-purple-500/20" title="MA均线5/10/20值">
            均线多排
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-blue-400 border border-blue-500/20" title="MACD动量指标">
            机构MACD
          </span>
        </div>
      </div>

      {/* 3. Main Candlestick SVG Chart Plotter */}
      <div ref={containerRef} className="flex-1 min-h-[300px] w-full relative group">
        <svg
          width={width}
          height={totalHeight}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 select-none cursor-crosshair overflow-visible"
          id="svg-trading-chart"
        >
          {/* Chart Background Grid Lines */}
          <g stroke="#27272a" strokeWidth="0.5" strokeDasharray="3 3">
            {/* Draw 4 horizontal markers in Candle main window */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const y = paddingTop + mainChartHeight * p;
              return <line key={i} x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} />;
            })}

            {/* Vertical grid lines mapping K-lines */}
            {[10, 20, 30].map((step, i) => {
              const x = getX(step);
              return <line key={i} x1={x} y1={paddingTop} x2={x} y2={macdYStart + macdChartHeight} />;
            })}
          </g>

          {/* Pricing Legend Axis (Leftern Labels) */}
          <g fill="#71717a" fontSize="9" fontFamily="monospace" textAnchor="end">
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const price = maxPrice - p * (maxPrice - minPrice);
              const y = paddingTop + mainChartHeight * p;
              return (
                <text key={i} x={paddingLeft - 6} y={y + 3}>
                  {formatNum(price, 2)}
                </text>
              );
            })}
          </g>

          {/* Volume Axis Labels (Right side) */}
          <g fill="#71717a" fontSize="9" fontFamily="monospace" textAnchor="start">
            <text x={width - paddingRight + 6} y={volYStart + 10}>
              {formatVolumeOrAmount(maxVol / 100, true)}
            </text>
            <text x={width - paddingRight + 6} y={volYStart + volChartHeight - 3}>
              0手
            </text>
          </g>

          {/* MACD Axis Labels */}
          <g fill="#71717a" fontSize="9" fontFamily="monospace" textAnchor="start">
            <text x={width - paddingRight + 6} y={macdYStart + 10}>
              {maxMacd.toFixed(2)}
            </text>
            <text x={width - paddingRight + 6} y={macdYStart + macdChartHeight / 2 + 3}>
              0
            </text>
            <text x={width - paddingRight + 6} y={macdYStart + macdChartHeight - 3}>
              {-maxMacd.toFixed(2)}
            </text>
          </g>

          {/* K-Lines Candlesticks Drawing */}
          <g id="candles">
            {recentKLines.map((k, i) => {
              const x = getX(i);
              const openY = getY(k.open);
              const closeY = getY(k.close);
              const highY = getY(k.high);
              const lowY = getY(k.low);

              const isGreen = k.close < k.open;
              const candleColor = isGreen ? "#22c55e" : "#ef4444"; // green for down, red for up
              const candleWidth = Math.max(2, (chartWidth / recentKLines.length) * 0.7);

              return (
                <g key={i}>
                  {/* High-Low Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />
                  {/* Candle Box body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={Math.min(openY, closeY)}
                    width={candleWidth}
                    height={Math.max(1.5, Math.abs(openY - closeY))}
                    fill={isGreen ? candleColor : "none"} // Empty outline for up candles is standard in A-Shares, but solid red is also highly utilized and clearer. Let's make it SOLID red for gorgeous screens!
                    stroke={candleColor}
                    strokeWidth="1"
                    fillOpacity={isGreen ? 0.35 : 0.8}
                  />
                </g>
              );
            })}
          </g>

          {/* Technical MA Curve Lines */}
          <g strokeWidth="1" fill="none">
            {ma5Path && <path d={ma5Path} stroke="#f59e0b" />} {/* Yellow MA5 */}
            {ma10Path && <path d={ma10Path} stroke="#a855f7" />} {/* Purple MA10 */}
            {ma20Path && <path d={ma20Path} stroke="#06b6d4" />} {/* Cyan MA20 */}
          </g>

          {/* Volume Section */}
          <g id="volumes">
            {recentKLines.map((k, i) => {
              const x = getX(i);
              const volY = getVolY(k.volume);
              const height = Math.max(1, volYStart + volChartHeight - volY);
              const candleWidth = Math.max(2, (chartWidth / recentKLines.length) * 0.7);
              const isUp = k.close >= k.open;
              const barColor = isUp ? "#ef4444" : "#22c55e";

              return (
                <rect
                  key={i}
                  x={x - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={height}
                  fill={barColor}
                  fillOpacity={isUp ? 0.8 : 0.35}
                  stroke={barColor}
                  strokeWidth="0.5"
                />
              );
            })}
          </g>

          {/* MACD Oscillator Section */}
          <g id="macd-pane">
            {/* Zero midline */}
            <line
              x1={paddingLeft}
              y1={macdYStart + macdChartHeight / 2}
              x2={width - paddingRight}
              y2={macdYStart + macdChartHeight / 2}
              stroke="#52525b"
              strokeWidth="0.5"
            />

            {/* MACD Pillar Column Bars */}
            {recentKLines.map((k, i) => {
              if (!k.macd) return null;
              const x = getX(i);
              const hist = k.macd.hist;
              const histY = getMacdY(hist);
              const zeroY = macdYStart + macdChartHeight / 2;
              
              const isUp = hist >= 0;
              const barColor = isUp ? "#ef4444" : "#22c55e";
              const candleWidth = Math.max(1.5, (chartWidth / recentKLines.length) * 0.5);

              return (
                <line
                  key={i}
                  x1={x}
                  y1={zeroY}
                  x2={x}
                  y2={histY}
                  stroke={barColor}
                  strokeWidth={candleWidth}
                  strokeOpacity={0.8}
                />
              );
            })}

            {/* DIFF/DEA Lines Overlay */}
            {diffPath && <path d={diffPath} stroke="#3b82f6" strokeWidth="1" fill="none" />}   {/* DIFF Blue */}
            {deaPath && <path d={deaPath} stroke="#eab308" strokeWidth="1" fill="none" />}     {/* DEA Yellow */}
          </g>

          {/* User Cursor Hover Crosshair Tracker */}
          {hoverIndex !== null && (
            <g id="crosshairs">
              {/* Vertical line matching cursor days */}
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={macdYStart + macdChartHeight}
                stroke="#a1a1aa"
                strokeWidth="0.8"
                strokeDasharray="4 4"
              />
              {/* Horizontal line following close price of hover day */}
              <line
                x1={paddingLeft}
                y1={getY(currentK.close)}
                x2={width - paddingRight}
                y2={getY(currentK.close)}
                stroke="#a1a1aa"
                strokeWidth="0.8"
                strokeDasharray="4 4"
              />

              {/* Ticker cross point circle */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(currentK.close)}
                r="4"
                fill="#ffed4a"
                stroke="#zinc-950"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Legend overlays */}
        <div className="absolute top-2 left-14 bg-zinc-950/80 p-1.5 rounded text-[10px] space-y-0.5 pointer-events-none border border-zinc-900 leading-none">
          <div className="text-zinc-500 font-bold mb-0.5">主图指标：均线</div>
          <div className="flex gap-2">
            <span className="text-[#f59e0b]">MA5: {currentK.ma5 ? `¥${formatNum(currentK.ma5)}` : '--'}</span>
            <span className="text-[#a855f7]">MA10: {currentK.ma10 ? `¥${formatNum(currentK.ma10)}` : '--'}</span>
            <span className="text-[#06b6d4]">MA20: {currentK.ma20 ? `¥${formatNum(currentK.ma20)}` : '--'}</span>
          </div>
        </div>

        <div className="absolute bottom-[macdChartHeight] left-14 bg-zinc-950/80 p-1 rounded text-[10px] pointer-events-none border border-zinc-900 leading-none">
          <div className="text-zinc-500 font-bold mb-0.5">附图指标：MACD(12,26,9)</div>
          {currentK.macd && (
            <div className="flex gap-2">
              <span className="text-[#3b82f6]">DIFF: {currentK.macd.diff.toFixed(3)}</span>
              <span className="text-[#eab308]">DEA: {currentK.macd.dea.toFixed(3)}</span>
              <span className={currentK.macd.hist >= 0 ? "text-red-400" : "text-green-500"}>
                MACD: {currentK.macd.hist.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
