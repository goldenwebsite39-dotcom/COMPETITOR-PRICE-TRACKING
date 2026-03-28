import { NextResponse } from 'next/server';

export async function GET() {
  const products = [
    { id: "1", name: "RTX 4090 OC", sku: "RTX4090-OC", category: "GPUs", costPrice: 1450, currentPrice: 1620 },
    { id: "2", name: "Intel i9-14900K", sku: "I9-14900K", category: "Processors", costPrice: 500, currentPrice: 599 },
  ];
  return NextResponse.json(products);
}
