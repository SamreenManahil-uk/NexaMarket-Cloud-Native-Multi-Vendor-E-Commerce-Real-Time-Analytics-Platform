export interface NexaAiProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  availableQuantity: number;
  category: string;
  seller: string;
}

export interface NexaAiResponse {
  message: string;
  products: NexaAiProduct[];
  grounded: true;
  source: "NEXAMARKET_CATALOGUE";
}

export interface NexaAiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: NexaAiProduct[];
}
