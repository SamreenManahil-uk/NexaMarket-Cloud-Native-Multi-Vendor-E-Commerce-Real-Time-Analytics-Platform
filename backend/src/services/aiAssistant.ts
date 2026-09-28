import {
  findCatalogueFallback,
  findProductsForAssistant,
  type AiCatalogueProduct,
} from "../repositories/aiCatalogue.js";

import {
  interpretShoppingQuery,
  type ShoppingIntent,
} from "../ai/queryInterpreter.js";

export interface AiAssistantResult {
  message: string;
  products: AiCatalogueProduct[];
  grounded: true;
  source: "NEXAMARKET_CATALOGUE";
  intent: {
    type: ShoppingIntent["type"];
    search: string;
    minPrice?: number;
    maxPrice?: number;
    inStockOnly: boolean;
  };
}

function money(value: string): string {
  return `£${Number(value).toFixed(2)}`;
}

function productSummary(
  product: AiCatalogueProduct,
): string {
  const stockText =
    product.availableQuantity > 0
      ? `${product.availableQuantity} in stock`
      : "currently out of stock";

  return `${product.name} (${money(product.price)}, ${stockText})`;
}

function result(
  message: string,
  products: AiCatalogueProduct[],
  intent: ShoppingIntent,
): AiAssistantResult {
  return {
    message,
    products,
    grounded: true,
    source: "NEXAMARKET_CATALOGUE",
    intent: {
      type: intent.type,
      search: intent.search,
      minPrice: intent.minPrice,
      maxPrice: intent.maxPrice,
      inStockOnly: intent.inStockOnly,
    },
  };
}

function noMatchMessage(
  intent: ShoppingIntent,
): string {
  if (intent.type === "OUT_OF_STOCK") {
    return "I could not find an out-of-stock product matching that request in the current NexaMarket catalogue.";
  }

  if (
    intent.maxPrice !== undefined &&
    intent.search
  ) {
    return `I could not find an in-stock ${intent.search} at or below £${intent.maxPrice.toFixed(2)} in the current NexaMarket catalogue.`;
  }

  if (intent.maxPrice !== undefined) {
    return `I could not find an in-stock product within the £${intent.maxPrice.toFixed(2)} budget in the current NexaMarket catalogue.`;
  }

  if (intent.search) {
    return `I could not find an in-stock product matching "${intent.search}" in the current NexaMarket catalogue.`;
  }

  return "I could not find a matching product in the current NexaMarket catalogue.";
}

function createAnswer(
  products: AiCatalogueProduct[],
  intent: ShoppingIntent,
): string {
  if (products.length === 0) {
    return noMatchMessage(intent);
  }

  const first = products[0]!;

  if (intent.type === "CHEAPEST") {
    return `The cheapest matching in-stock option is ${productSummary(first)}. I have also shown the next closest catalogue options below.`;
  }

  if (intent.type === "MOST_EXPENSIVE") {
    return `The highest-priced matching in-stock option is ${productSummary(first)}. The results below are ordered from highest to lower price.`;
  }

  if (intent.type === "STOCK") {
    if (products.length === 1) {
      return `${first.name} is currently in stock with ${first.availableQuantity} unit${first.availableQuantity === 1 ? "" : "s"} available at ${money(first.price)}.`;
    }

    return `I found ${products.length} matching in-stock products. ${products
      .slice(0, 3)
      .map(productSummary)
      .join("; ")}.`;
  }

  if (intent.type === "OUT_OF_STOCK") {
    return `I found ${products.length} matching out-of-stock product${products.length === 1 ? "" : "s"}. ${products
      .slice(0, 3)
      .map((product) => `${product.name} (${money(product.price)})`)
      .join("; ")}.`;
  }

  if (intent.type === "COMPARE") {
    if (products.length < 2) {
      return `I found only one matching catalogue product: ${productSummary(first)}. I need two matching catalogue products for a direct comparison.`;
    }

    const firstTwo = products.slice(0, 2);

    const cheapest = [...firstTwo].sort(
      (a, b) =>
        Number(a.price) - Number(b.price),
    )[0]!;

    const moreStock = [...firstTwo].sort(
      (a, b) =>
        b.availableQuantity -
        a.availableQuantity,
    )[0]!;

    return `Here is a catalogue comparison: ${productSummary(firstTwo[0]!)} versus ${productSummary(firstTwo[1]!)}. ${cheapest.name} has the lower current price, while ${moreStock.name} has the higher current stock quantity.`;
  }

  if (intent.type === "BUDGET") {
    const budgetText =
      intent.maxPrice !== undefined
        ? ` within your £${intent.maxPrice.toFixed(2)} budget`
        : "";

    return `I found ${products.length} in-stock option${products.length === 1 ? "" : "s"}${budgetText}. The lowest-priced match is ${productSummary(first)}.`;
  }

  return `I found ${products.length} matching in-stock product${products.length === 1 ? "" : "s"}. Top matches: ${products
    .slice(0, 3)
    .map(productSummary)
    .join("; ")}.`;
}

export async function askNexaAssistant(
  rawMessage: string,
): Promise<AiAssistantResult> {
  const intent =
    interpretShoppingQuery(rawMessage);

  let products =
    await findProductsForAssistant({
      search:
        intent.search || undefined,
      searchTerms:
        intent.searchTerms.length
          ? intent.searchTerms
          : undefined,
      minPrice: intent.minPrice,
      maxPrice: intent.maxPrice,
      inStockOnly: intent.inStockOnly,
      outOfStockOnly:
        intent.outOfStockOnly,
      limit: intent.limit,
      sort: intent.sort,
    });

  /*
   * Natural-language searches can contain descriptive
   * words that are not literal catalogue text.
   *
   * If a budget/price query has no literal-text match,
   * safely fall back to catalogue price/stock filters.
   * We never invent products: fallback results still
   * come directly from PostgreSQL.
   */
  if (
    products.length === 0 &&
    intent.search &&
    (
      intent.type === "BUDGET" ||
      intent.type === "CHEAPEST" ||
      intent.type === "MOST_EXPENSIVE"
    )
  ) {
    products =
      await findCatalogueFallback({
        minPrice: intent.minPrice,
        maxPrice: intent.maxPrice,
        inStockOnly:
          intent.inStockOnly,
        outOfStockOnly:
          intent.outOfStockOnly,
        limit: intent.limit,
        sort: intent.sort,
      });
  }

  return result(
    createAnswer(products, intent),
    products,
    intent,
  );
}
