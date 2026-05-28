import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini API client safely if key is available
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.use(express.json());

// API: AI Market Stock Analysis Endpoint
app.post("/api/stock-analysis", async (req, res) => {
  try {
    const { stockName, stockCode, currentPrice, changePercent, holdingsStatus, recentKLines, extraQuery } = req.body;

    if (!aiClient) {
      return res.status(503).json({
        error: "AI 服务暂时不可用。请确保已在 Settings > Secrets 选项卡中配置了 GEMINI_API_KEY。",
      });
    }

    const prompt = `
      您是一位拥有25年从业经验的资深证券首席分析师。
      
      当前分析对象：
      - 股票名称：${stockName} (${stockCode})
      - 当前价格：${currentPrice} 元 
      - 今日涨跌幅：${changePercent}%
      - 您的当前持有状态：${holdingsStatus || "未持仓"}
      ${recentKLines ? `- 近期10个交易日价格序列: ${JSON.stringify(recentKLines)}` : ""}
      
      用户提出的问题或分析需求：${extraQuery || "多维度技术形态与盘口买卖深度诊断，并给出具体的仿真操盘策略建议。"}
      
      请提供一份深度、专业的分析。内容应包括：
      1. 【资金流量与买卖深度研判】：根据当前的估值与近期走势，研判主力资金动向与筹码分布状态。
      2. 【技术指标深度剖析】：分析近期走势支撑位、阻力位和可能的技术形态走势（如突破、整理、多头排列等）。
      3. 【资深操盘演练策略】：如果是空仓应该怎么分配资金分批吸货，如果是重仓应如何做T降低成本或止盈止损。给出针对性强、科学可行的仓位控制策略（如：三分之一仓位防御，加仓红线等）。
      4. 【宏观与行业催化剂诊断】：结合当前市场最新走势，推演本股票所属板块的宏观逻辑。
      
      请用高度专业、严肃的证券分析师口吻撰写，避免口语化，不要出现任何带有“模拟”或“虚拟交易”类似的词汇，将我们这里当做顶级机构的“实盘仿真策略终端”来看待。
    `;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    res.json({
      analysis: response.text || "未能生成分析报告，请稍后再试。",
    });
  } catch (error: any) {
    console.error("Gemini API Error in backend:", error);
    res.status(500).json({
      error: "分析服务响应异常: " + (error.message || error),
    });
  }
});

// Configure Vite or Static Middleware
const isProd = process.env.NODE_ENV === "production";

async function setupServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Professional Stock Trading Terminal Backend server boots up successfully!`);
    console.log(`Access at http://localhost:${PORT}`);
  });
}

setupServer();
