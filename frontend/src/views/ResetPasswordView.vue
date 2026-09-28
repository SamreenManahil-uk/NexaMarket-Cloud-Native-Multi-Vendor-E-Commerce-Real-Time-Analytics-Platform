<script setup lang="ts">
import { computed, ref } from "vue";
import {
  RouterLink,
  useRoute,
} from "vue-router";

const route = useRoute();

const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const success = ref(false);
const error = ref("");

const token = computed(() =>
  typeof route.query.token === "string"
    ? route.query.token
    : "",
);

async function submit() {
  error.value = "";

  if (!token.value) {
    error.value =
      "This password reset link is invalid.";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match.";
    return;
  }

  try {
    loading.value = true;

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/auth/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token.value,
          password: password.value,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "Unable to reset your password.",
      );
    }

    success.value = true;
    password.value = "";
    confirmPassword.value = "";
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Unable to reset your password.";
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
        SECURE PASSWORD RESET
      </span>

      <template v-if="!success">
        <h1>Create a new password.</h1>

        <p>
          Choose a strong password for your
          NexaMarket account.
        </p>

        <form
          class="nx-recovery-form"
          @submit.prevent="submit"
        >
          <label for="new-password">
            New password
          </label>

          <input
            id="new-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="10"
            required
          />

          <small>
            At least 10 characters with uppercase,
            lowercase and a number.
          </small>

          <label for="confirm-password">
            Confirm new password
          </label>

          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            minlength="10"
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
                ? "Updating..."
                : "Update password"
            }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="nx-auth-status-icon success">
          ✓
        </div>

        <h1>Password updated.</h1>

        <p>
          Your new password is ready to use.
        </p>

        <RouterLink
          to="/auth"
          class="nx-auth-primary-link"
        >
          Sign in to NexaMarket →
        </RouterLink>
      </template>
    </section>
  </main>
</template>
