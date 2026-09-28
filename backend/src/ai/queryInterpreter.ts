export type ShoppingSort =
  | "RELEVANCE"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "STOCK_DESC";

export type ShoppingIntentType =
  | "SEARCH"
  | "CHEAPEST"
  | "MOST_EXPENSIVE"
  | "STOCK"
  | "COMPARE"
  | "BUDGET"
  | "OUT_OF_STOCK";

export interface ShoppingIntent {
  originalMessage: string;
  search: string;
  searchTerms: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  outOfStockOnly: boolean;
  limit: number;
  sort: ShoppingSort;
  type: ShoppingIntentType;
}

function extractNumber(
  text: string,
  patterns: RegExp[],
): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const value = Number(match[1]);

      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return undefined;
}

function uniqueTerms(values: string[]): string[] {
  return [...new Set(
    values
      .map((value) => value.trim())
      .filter((value) => value.length >= 2),
  )];
}

function cleanSearchText(text: string): string {
  return text
    .replace(
      /(?:under|below|less than|up to|max(?:imum)?|within)\s*£?\s*\d+(?:\.\d+)?/gi,
      " ",
    )
    .replace(
      /(?:over|above|more than|min(?:imum)?|from)\s*£?\s*\d+(?:\.\d+)?/gi,
      " ",
    )
    .replace(
      /£\s*\d+(?:\.\d+)?\s*(?:or less|or under|max(?:imum)?)/gi,
      " ",
    )
    .replace(
      /\b(?:cheapest|lowest price|least expensive|most expensive|highest price|pricey)\b/gi,
      " ",
    )
    .replace(
      /\b(?:in stock|available now|available|availability|stock|out of stock|sold out)\b/gi,
      " ",
    )
    .replace(
      /\b(?:compare|comparison|versus|vs\.?|between)\b/gi,
      " ",
    )
    .replace(
      /\b(?:find|show|search|recommend|suggest|give|tell|check|looking|look|want|need|can|could|would|do|does|have|has|is|are|me|my|please|products?|items?|something|anything|options?|choices?|for|the|a|an|your|you|nexamarket)\b/gi,
      " ",
    )
    .replace(/[?!,;:()[\]{}"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitComparisonTerms(text: string): string[] {
  const normalised = text
    .replace(/\bcompare\b/gi, " ")
    .replace(/\bcomparison\b/gi, " ")
    .replace(/\bbetween\b/gi, " ")
    .trim();

  const pieces = normalised.split(
    /\s+(?:vs\.?|versus|and)\s+/i,
  );

  return uniqueTerms(
    pieces.map((piece) => cleanSearchText(piece)),
  ).slice(0, 2);
}

export function interpretShoppingQuery(
  rawMessage: string,
): ShoppingIntent {
  const originalMessage = rawMessage.trim();

  const maxPrice = extractNumber(originalMessage, [
    /(?:under|below|less than|up to|max(?:imum)?|within)\s*£?\s*(\d+(?:\.\d+)?)/i,
    /£\s*(\d+(?:\.\d+)?)\s*(?:or less|or under|max(?:imum)?)/i,
    /\b(?:budget(?:\s+is|\s+of)?|spend)\s*£?\s*(\d+(?:\.\d+)?)/i,
    /\bi have\s*£?\s*(\d+(?:\.\d+)?)\b/i,
  ]);

  const minPrice = extractNumber(originalMessage, [
    /(?:over|above|more than|min(?:imum)?|from)\s*£?\s*(\d+(?:\.\d+)?)/i,
  ]);

  const wantsOutOfStock =
    /\b(out of stock|sold out|unavailable)\b/i.test(
      originalMessage,
    );

  const asksStock =
    /\b(in stock|available|availability|stock)\b/i.test(
      originalMessage,
    );

  const cheapest =
    /\b(cheapest|lowest price|least expensive)\b/i.test(
      originalMessage,
    );

  const mostExpensive =
    /\b(most expensive|highest price|pricey)\b/i.test(
      originalMessage,
    );

  const compare =
    /\b(compare|comparison|versus|vs\.?|between)\b/i.test(
      originalMessage,
    );

  const budget =
    maxPrice !== undefined &&
    /\b(budget|spend|under|below|up to|within|i have)\b/i.test(
      originalMessage,
    );

  let type: ShoppingIntentType = "SEARCH";

  if (compare) {
    type = "COMPARE";
  } else if (wantsOutOfStock) {
    type = "OUT_OF_STOCK";
  } else if (cheapest) {
    type = "CHEAPEST";
  } else if (mostExpensive) {
    type = "MOST_EXPENSIVE";
  } else if (asksStock) {
    type = "STOCK";
  } else if (budget) {
    type = "BUDGET";
  }

  let sort: ShoppingSort = "RELEVANCE";

  if (cheapest || budget) {
    sort = "PRICE_ASC";
  } else if (mostExpensive) {
    sort = "PRICE_DESC";
  } else if (asksStock) {
    sort = "STOCK_DESC";
  }

  const comparisonTerms = compare
    ? splitComparisonTerms(originalMessage)
    : [];

  const cleaned = cleanSearchText(originalMessage);

  const normalisedSearch = cleaned
    .split(" ")
    .map((word) => {
      if (
        word.length > 4 &&
        word.toLowerCase().endsWith("s") &&
        !word.toLowerCase().endsWith("ss")
      ) {
        return word.slice(0, -1);
      }

      return word;
    })
    .join(" ")
    .trim();

  const searchTerms = compare
    ? comparisonTerms
    : normalisedSearch
      ? [normalisedSearch]
      : [];

  return {
    originalMessage,
    search: searchTerms[0] ?? "",
    searchTerms,
    minPrice,
    maxPrice,
    inStockOnly: !wantsOutOfStock,
    outOfStockOnly: wantsOutOfStock,
    limit: compare ? 6 : 6,
    sort,
    type,
  };
}
