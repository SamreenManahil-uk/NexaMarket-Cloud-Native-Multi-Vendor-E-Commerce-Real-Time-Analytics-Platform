import type {
  AuthResponse,
  AuthUser,
  RegistrationResponse,
} from "../types/auth";

const base = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

interface ErrorBody {
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "We could not connect to NexaMarket. Please try again.",
    );
  }

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error("NexaMarket could not complete this request.");
    }
  }

  if (!response.ok) {
    const errorBody = body as ErrorBody;

    if (response.status === 401) {
      throw new Error("Your email or password is incorrect.");
    }

    if (response.status === 409) {
      throw new Error("An account with this email already exists.");
    }

    if (response.status === 400) {
      throw new Error("Please check the information you entered.");
    }

    throw new Error(
      errorBody?.error || "Something went wrong. Please try again.",
    );
  }

  return body as T;
}

export const authApi = {
  register(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return request<RegistrationResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  login(input: { email: string; password: string }) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },


  google(credential: string) {
    return request<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
  },

  me(token: string) {
    return request<{ user: AuthUser }>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
