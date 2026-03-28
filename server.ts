import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let products = [
    { id: "1", name: "RTX 4090 OC", sku: "RTX4090-OC", category: "GPUs", costPrice: 1450, currentPrice: 1620 },
    { id: "2", name: "Intel i9-14900K", sku: "I9-14900K", category: "Processors", costPrice: 500, currentPrice: 599 },
  ];

  let competitorPrices = [
    { id: "1", productId: "1", competitorName: "Amazon", price: 1642, url: "https://amazon.ae/rtx4090", timestamp: new Date().toISOString() },
    { id: "2", productId: "1", competitorName: "Noon", price: 1650, url: "https://noon.com/rtx4090", timestamp: new Date().toISOString() },
  ];

  app.get("/api/products", (req, res) => res.json(products));
  app.get("/api/competitor-prices", (req, res) => res.json(competitorPrices));

  // API: Mock Scraper
  app.post("/api/scrape", async (req, res) => {
    const { url, competitor } = req.body;
    try {
      // In a real app, we'd use Puppeteer/Playwright for Amazon/Noon
      // For this demo, we'll simulate a scrape result
      const mockPrices: Record<string, number> = {
        "Amazon": 2499 + (Math.random() * 200 - 100),
        "Noon": 2549 + (Math.random() * 200 - 100),
        "Local Store": 2450 + (Math.random() * 200 - 100),
      };

      const price = mockPrices[competitor] || 2500;
      
      res.json({
        competitor_name: competitor,
        price: Math.round(price),
        url: url,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Scraping failed" });
    }
  });

  // API: AI Pricing Suggestion
  app.post("/api/suggest-price", async (req, res) => {
    const { costPrice, competitorPrices, margin } = req.body;
    const avgMarket = competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length;
    const minMarket = Math.min(...competitorPrices);
    
    // Simple logic for now, could use Gemini
    const suggested = Math.max(costPrice * (1 + margin), minMarket * 0.98);
    
    res.json({
      suggestedPrice: Math.round(suggested),
      reasoning: `Recommended price: AED ${Math.round(suggested).toLocaleString()} (2% lower than market leader)`,
      marketAverage: Math.round(avgMarket),
      bestCompetitor: Math.round(minMarket),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
