import { NextResponse } from 'next/server';

export async function GET() {
  const competitorPrices = [
    { id: "1", productId: "1", competitorName: "Amazon", price: 1642, url: "https://amazon.ae/rtx4090", timestamp: new Date().toISOString() },
    { id: "2", productId: "1", competitorName: "Noon", price: 1650, url: "https://noon.com/rtx4090", timestamp: new Date().toISOString() },
  ];
  return NextResponse.json(competitorPrices);
}
