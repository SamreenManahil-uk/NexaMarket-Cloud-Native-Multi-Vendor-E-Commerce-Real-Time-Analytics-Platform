<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";

const email = ref("");
const loading = ref(false);
const sent = ref(false);
const error = ref("");

async function submit() {
  if (!email.value.trim()) return;

  try {
    loading.value = true;
    error.value = "";

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.value.trim(),
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Unable to process your request.",
      );
    }

    sent.value = true;
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Unable to process your request.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="nx-auth-status">
    <section class="nx-auth-status-card">
      <RouterLink to="/" class="nx-auth-status-logo">
        NexaMarket.
      </RouterLink>

      <span class="nx-auth-eyebrow">
        ACCOUNT RECOVERY
      </span>

      <template v-if="!sent">
        <h1>Forgot your password?</h1>

        <p>
          Enter your email address and we'll send you
          a secure password reset link.
        </p>

        <form
          class="nx-recovery-form"
          @submit.prevent="submit"
        >
          <label for="recovery-email">
            Email address
          </label>

          <input
            id="recovery-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />

          <p
            v-if="error"
            class="nx-auth-error"
            role="alert"
          >
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="loading"
          >
            {{
              loading
                ? "Sending..."
                : "Send reset link"
            }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="nx-auth-status-icon success">
          ✓
        </div>

        <h1>Check your inbox.</h1>

        <p>
          If an account exists for that email, we've
          sent a password reset link.
        </p>
      </template>

      <RouterLink
        to="/auth"
        class="nx-auth-secondary-link"
      >
        ← Back to sign in
      </RouterLink>
    </section>
  </main>
</template>
