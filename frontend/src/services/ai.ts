import type { NexaAiResponse } from "../types/ai";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function askNexaAi(
  message: string,
): Promise<NexaAiResponse> {
  const response = await fetch(
    `${API_URL}/api/ai/assistant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "Nexa AI request failed",
    );
  }

  return body.data as NexaAiResponse;
}
