<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();

const loading = ref(true);
const success = ref(false);
const message = ref("");

onMounted(async () => {
  const token =
    typeof route.query.token === "string"
      ? route.query.token
      : "";

  if (!token) {
    loading.value = false;
    message.value = "This verification link is invalid.";
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          "This verification link is invalid or has expired.",
      );
    }

    success.value = true;
    message.value =
      data.message ||
      "Your email has been verified successfully.";
  } catch (error) {
    message.value =
      error instanceof Error
        ? error.message
        : "Unable to verify your email.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="nx-auth-status">
    <section class="nx-auth-status-card">
      <RouterLink to="/" class="nx-auth-status-logo">
        NexaMarket.
      </RouterLink>

      <div
        class="nx-auth-status-icon"
        :class="{
          success,
          error: !loading && !success,
        }"
      >
        <span v-if="loading">•••</span>
        <span v-else-if="success">✓</span>
        <span v-else>!</span>
      </div>

      <template v-if="loading">
        <span class="nx-auth-eyebrow">
          EMAIL VERIFICATION
        </span>

        <h1>Verifying your email...</h1>

        <p>
          Please wait while NexaMarket confirms your
          verification link.
        </p>
      </template>

      <template v-else-if="success">
        <span class="nx-auth-eyebrow">
          EMAIL VERIFIED
        </span>

        <h1>Your account is ready.</h1>

        <p>{{ message }}</p>

        <RouterLink
          to="/auth"
          class="nx-auth-primary-link"
        >
          Continue to sign in →
        </RouterLink>
      </template>

      <template v-else>
        <span class="nx-auth-eyebrow">
          VERIFICATION ISSUE
        </span>

        <h1>We couldn't verify this link.</h1>

        <p>{{ message }}</p>

        <RouterLink
          to="/auth"
          class="nx-auth-primary-link"
        >
          Return to sign in →
        </RouterLink>
      </template>
    </section>
  </main>
</template>
