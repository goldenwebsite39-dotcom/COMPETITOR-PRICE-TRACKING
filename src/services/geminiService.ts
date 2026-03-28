import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getSmartPricingSuggestion(
  productName: string,
  costPrice: number,
  competitorPrices: { name: string; price: number }[]
) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze the following product pricing data for an eCommerce store (Golden Cloud Computer).
    Product: ${productName}
    Our Cost Price: AED ${costPrice}
    Competitor Prices: ${competitorPrices.map(c => `${c.name}: AED ${c.price}`).join(", ")}
    
    Suggest an optimal selling price that balances competitiveness and profit margin (target 10-20% margin).
    Provide a clear reasoning for the suggestion.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedPrice: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            marketPosition: { type: Type.STRING }
          },
          required: ["suggestedPrice", "reasoning", "marketPosition"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini pricing suggestion error:", error);
    return null;
  }
}
