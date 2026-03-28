import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { costPrice, competitorPrices, margin } = await request.json();
  
  const avgMarket = competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length;
  const minMarket = Math.min(...competitorPrices);
  
  const suggested = Math.max(costPrice * (1 + margin), minMarket * 0.98);
  
  return NextResponse.json({
    suggestedPrice: Math.round(suggested),
    reasoning: `Recommended price: AED ${Math.round(suggested).toLocaleString()} (2% lower than market leader)`,
    marketAverage: Math.round(avgMarket),
    bestCompetitor: Math.round(minMarket),
  });
}
