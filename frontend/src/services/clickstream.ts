const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type ClickstreamEventType =
  | "PAGE_VIEW"
  | "PRODUCT_VIEW"
  | "SEARCH"
  | "ADD_TO_CART"
  | "ADD_TO_WISHLIST";

const SESSION_KEY = "nexamarket_session_id";

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

export async function trackClickstream(
  eventType: ClickstreamEventType,
  data: {
    productId?: string;
    searchQuery?: string;
    path?: string;
  } = {},
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/events/clickstream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        sessionId: getSessionId(),
        productId: data.productId ?? null,
        searchQuery: data.searchQuery ?? null,
        path: data.path ?? window.location.pathname,
      }),
    });
  } catch {
    // Analytics must never break the shopping experience.
  }
}
