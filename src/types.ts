export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  currentPrice: number;
  image: string;
}

export interface CompetitorPrice {
  id: string;
  productId: string;
  competitorName: string;
  price: number;
  url: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'critical' | 'market' | 'inventory' | 'rule';
  title: string;
  description: string;
  productId?: string;
  marketAvg?: number;
  yourPrice?: number;
  volatility?: number;
  timestamp: string;
}
