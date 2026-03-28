import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { url, competitor } = await request.json();
  
  try {
    const mockPrices: Record<string, number> = {
      "Amazon": 2499 + (Math.random() * 200 - 100),
      "Noon": 2549 + (Math.random() * 200 - 100),
      "Local Store": 2450 + (Math.random() * 200 - 100),
    };

    const price = mockPrices[competitor] || 2500;
    
    return NextResponse.json({
      competitor_name: competitor,
      price: Math.round(price),
      url: url,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Scraping failed" }, { status: 500 });
  }
}
