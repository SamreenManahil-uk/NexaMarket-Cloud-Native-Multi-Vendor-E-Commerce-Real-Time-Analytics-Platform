<script setup lang="ts">
import { nextTick, ref } from "vue";
import { RouterLink } from "vue-router";
import { askNexaAi } from "../services/ai";
import type {
  NexaAiMessage,
  NexaAiProduct,
} from "../types/ai";

const prompt = ref("");
const loading = ref(false);
const error = ref("");
const chatEnd = ref<HTMLElement | null>(null);

const messages = ref<NexaAiMessage[]>([
  {
    id: crypto.randomUUID(),
    role: "assistant",
    text:
      "Hi, I'm Nexa AI. I search the live NexaMarket catalogue to help you find products by name, category and budget.",
  },
]);

const suggestions = [
  "Find Kafka products under £30",
  "Show me Demo Accessories",
  "Find products under £50",
];

function productLink(product: NexaAiProduct) {
  return `/products/${product.id}`;
}

async function scrollToEnd() {
  await nextTick();

  chatEnd.value?.scrollIntoView({
    behavior: "smooth",
  });
}

async function sendMessage(value?: string) {
  const message = (value ?? prompt.value).trim();

  if (!message || loading.value) return;

  messages.value.push({
    id: crypto.randomUUID(),
    role: "user",
    text: message,
  });

  prompt.value = "";
  error.value = "";
  loading.value = true;

  await scrollToEnd();

  try {
    const result = await askNexaAi(message);

    messages.value.push({
      id: crypto.randomUUID(),
      role: "assistant",
      text: result.message,
      products: result.products,
    });
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Nexa AI is temporarily unavailable.";
  } finally {
    loading.value = false;
    await scrollToEnd();
  }
}
</script>

<template>
  <main class="nexa-ai-page">
    <section class="nexa-ai-hero">
      <div class="nexa-ai-hero-copy">
        <p class="nexa-ai-eyebrow">
          NEXAMARKET INTELLIGENCE
        </p>

        <h1>
          Meet <span>Nexa AI</span>
        </h1>

        <p class="nexa-ai-intro">
          Search the real NexaMarket catalogue using
          natural language. Product prices and stock are
          grounded in live marketplace data.
        </p>

        <div class="nexa-ai-badges">
          <span>Live catalogue</span>
          <span>Real inventory</span>
          <span>Grounded results</span>
        </div>
      </div>

      <div class="nexa-ai-orb" aria-hidden="true">
        <div class="nexa-ai-orb-inner">
          N
        </div>
      </div>
    </section>

    <section class="nexa-ai-workspace">
      <aside class="nexa-ai-sidebar">
        <p class="sidebar-label">
          TRY ASKING
        </p>

        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          type="button"
          class="suggestion-button"
          :disabled="loading"
          @click="sendMessage(suggestion)"
        >
          {{ suggestion }}
        </button>

        <div class="grounding-card">
          <strong>Catalogue grounded</strong>

          <p>
            Nexa AI only returns products currently found
            in the NexaMarket catalogue.
          </p>
        </div>
      </aside>

      <section
        class="nexa-ai-chat"
        aria-label="Nexa AI shopping assistant"
      >
        <div class="chat-header">
          <div>
            <p class="chat-status">
              <span class="status-dot"></span>
              ONLINE
            </p>

            <h2>Nexa AI Shopping Assistant</h2>
          </div>

          <span class="live-label">
            LIVE CATALOGUE
          </span>
        </div>

        <div
          class="messages"
          aria-live="polite"
        >
          <article
            v-for="message in messages"
            :key="message.id"
            class="message-row"
            :class="message.role"
          >
            <div class="message-avatar">
              {{ message.role === "assistant" ? "N" : "You" }}
            </div>

            <div class="message-content">
              <div class="message-bubble">
                {{ message.text }}
              </div>

              <div
                v-if="
                  message.role === 'assistant' &&
                  message.products?.length
                "
                class="ai-products"
              >
                <article
                  v-for="product in message.products"
                  :key="product.id"
                  class="ai-product-card"
                >
                  <div class="ai-product-image">
                    <img
                      v-if="product.imageUrl"
                      :src="product.imageUrl"
                      :alt="product.name"
                    />

                    <div
                      v-else
                      class="image-empty"
                      aria-hidden="true"
                    >
                      NM
                    </div>
                  </div>

                  <div class="ai-product-info">
                    <p class="product-category">
                      {{ product.category }}
                    </p>

                    <h3>{{ product.name }}</h3>

                    <p class="product-seller">
                      Sold by {{ product.seller }}
                    </p>

                    <div class="product-meta">
                      <strong>
                        £{{ Number(product.price).toFixed(2) }}
                      </strong>

                      <span>
                        {{ product.availableQuantity }} in stock
                      </span>
                    </div>

                    <RouterLink
                      :to="productLink(product)"
                      class="view-product"
                    >
                      View product
                      <span aria-hidden="true">→</span>
                    </RouterLink>
                  </div>
                </article>
              </div>
            </div>
          </article>

          <article
            v-if="loading"
            class="message-row assistant"
          >
            <div class="message-avatar">
              N
            </div>

            <div class="message-bubble typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </article>

          <div ref="chatEnd"></div>
        </div>

        <p
          v-if="error"
          class="ai-error"
          role="alert"
        >
          {{ error }}
        </p>

        <form
          class="ai-composer"
          @submit.prevent="sendMessage()"
        >
          <label
            for="nexa-ai-input"
            class="sr-only"
          >
            Ask Nexa AI
          </label>

          <input
            id="nexa-ai-input"
            v-model="prompt"
            type="text"
            maxlength="500"
            autocomplete="off"
            placeholder="Ask for a product, category or budget..."
            :disabled="loading"
          />

          <button
            type="submit"
            :disabled="loading || !prompt.trim()"
          >
            {{ loading ? "Searching..." : "Ask Nexa AI" }}
          </button>
        </form>

        <p class="ai-disclaimer">
          Recommendations are based on the current
          NexaMarket catalogue and available inventory.
        </p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.nexa-ai-page {
  min-height: 100vh;
  padding-bottom: 80px;
  background:
    linear-gradient(180deg, #f3f5ef 0, #fbfaf7 360px);
  color: #18382e;
}

.nexa-ai-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) 320px;
  gap: 60px;
  align-items: center;
  width: min(calc(100% - 48px), 1280px);
  margin: 0 auto;
  padding: 72px 0 55px;
}

.nexa-ai-hero::before {
  content: "";
  position: absolute;
  top: 28px;
  right: 40px;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background: rgba(245, 205, 82, .18);
  filter: blur(2px);
}

.nexa-ai-hero-copy {
  position: relative;
  z-index: 2;
  max-width: 760px;
}

.nexa-ai-eyebrow,
.sidebar-label {
  margin: 0 0 14px;
  color: #237052;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .15em;
}

.nexa-ai-hero h1 {
  margin: 0;
  color: #17372c;
  font-size: clamp(50px, 7vw, 82px);
  line-height: .94;
  letter-spacing: -.06em;
}

.nexa-ai-hero h1 span {
  color: #176548;
}

.nexa-ai-intro {
  max-width: 650px;
  margin: 25px 0 0;
  color: #6e7771;
  font-size: 17px;
  line-height: 1.7;
}

.nexa-ai-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 28px;
}

.nexa-ai-badges span {
  padding: 9px 13px;
  border: 1px solid #d8ded8;
  border-radius: 999px;
  background: rgba(255,255,255,.7);
  color: #315c4c;
  font-size: 11px;
  font-weight: 800;
}

.nexa-ai-orb {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 270px;
  height: 270px;
  justify-self: end;
  border: 1px solid rgba(24, 82, 61, .12);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, #fff8d7, transparent 35%),
    linear-gradient(145deg, #e9f2eb, #f6e3df);
  box-shadow: 0 28px 65px rgba(34, 73, 59, .12);
}

.nexa-ai-orb::before,
.nexa-ai-orb::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(23, 101, 72, .18);
}

.nexa-ai-orb::before {
  inset: 25px;
}

.nexa-ai-orb::after {
  inset: 49px;
}

.nexa-ai-orb-inner {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 115px;
  height: 115px;
  border-radius: 35px;
  background: #173f32;
  color: #f3d15c;
  font-size: 50px;
  font-weight: 900;
  box-shadow: 0 18px 40px rgba(23,63,50,.25);
  transform: rotate(-5deg);
}

.nexa-ai-workspace {
  display: grid;
  grid-template-columns: 265px minmax(0, 1fr);
  gap: 20px;
  width: min(calc(100% - 48px), 1280px);
  margin: 0 auto;
  align-items: start;
}

.nexa-ai-sidebar {
  position: sticky;
  top: 22px;
  padding: 23px;
  border: 1px solid #e0e5df;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(25, 55, 45, .04);
}

.sidebar-label {
  margin-bottom: 17px;
}

.suggestion-button {
  display: flex;
  width: 100%;
  min-height: 50px;
  margin-bottom: 9px;
  padding: 12px 14px;
  align-items: center;
  border: 1px solid #e3e7e1;
  border-radius: 12px;
  background: #fafbf8;
  color: #314b41;
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: .16s ease;
}

.suggestion-button::before {
  content: "↗";
  margin-right: 10px;
  color: #277052;
}

.suggestion-button:hover:not(:disabled) {
  border-color: #bfcfc5;
  background: #eef4ef;
  transform: translateX(2px);
}

.suggestion-button:disabled {
  opacity: .55;
  cursor: wait;
}

.grounding-card {
  margin-top: 20px;
  padding: 18px;
  border-radius: 15px;
  background: #173f32;
  color: #fff;
}

.grounding-card::before {
  content: "✓";
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: #f1cf59;
  color: #173f32;
  font-size: 12px;
  font-weight: 900;
}

.grounding-card strong {
  font-size: 13px;
}

.grounding-card p {
  margin: 7px 0 0;
  color: #c7d8d1;
  font-size: 11px;
  line-height: 1.55;
}

.nexa-ai-chat {
  overflow: hidden;
  border: 1px solid #dfe4de;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(28, 61, 50, .07);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 84px;
  padding: 0 27px;
  border-bottom: 1px solid #e7eae6;
  background: #fff;
}

.chat-status {
  display: flex;
  gap: 7px;
  align-items: center;
  margin: 0 0 5px;
  color: #277052;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .12em;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #42a373;
  box-shadow: 0 0 0 4px #e6f4eb;
}

.chat-header h2 {
  margin: 0;
  color: #17372c;
  font-size: 20px;
  letter-spacing: -.02em;
}

.live-label {
  padding: 8px 11px;
  border-radius: 999px;
  background: #eef4ef;
  color: #246248;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .09em;
}

.messages {
  min-height: 470px;
  max-height: 660px;
  overflow-y: auto;
  padding: 30px 27px;
  scroll-behavior: smooth;
  background:
    radial-gradient(circle at 100% 0, rgba(244,211,98,.08), transparent 25%),
    #fcfcfa;
}

.message-row {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-bottom: 23px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 12px;
  background: #173f32;
  color: #f1cf59;
  font-size: 11px;
  font-weight: 900;
}

.message-row.user .message-avatar {
  background: #f0e7df;
  color: #795e50;
  font-size: 9px;
}

.message-content {
  max-width: min(760px, calc(100% - 52px));
}

.message-row.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-bubble {
  width: fit-content;
  max-width: 680px;
  padding: 14px 17px;
  border: 1px solid #e1e6e1;
  border-radius: 5px 17px 17px 17px;
  background: #fff;
  color: #35473f;
  font-size: 13px;
  line-height: 1.65;
  box-shadow: 0 4px 15px rgba(25,55,45,.035);
}

.message-row.user .message-bubble {
  border: 0;
  border-radius: 17px 5px 17px 17px;
  background: #173f32;
  color: #fff;
}

.ai-products {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.ai-product-card {
  display: grid;
  grid-template-columns: 115px minmax(0, 1fr);
  min-height: 160px;
  overflow: hidden;
  border: 1px solid #e1e5e0;
  border-radius: 15px;
  background: #fff;
}

.ai-product-image {
  min-height: 160px;
  overflow: hidden;
  background: #f2f3ef;
}

.ai-product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #668077;
  font-weight: 900;
}

.ai-product-info {
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-width: 0;
}

.product-category {
  margin: 0 0 5px;
  color: #2d7658;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.ai-product-info h3 {
  margin: 0;
  color: #17372c;
  font-size: 14px;
  line-height: 1.25;
}

.product-seller {
  margin: 6px 0 12px;
  color: #8a918c;
  font-size: 10px;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  align-items: center;
}

.product-meta strong {
  color: #17372c;
  font-size: 16px;
}

.product-meta span {
  color: #397158;
  font-size: 9px;
  font-weight: 750;
}

.view-product {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eceeea;
  color: #1e654a;
  font-size: 10px;
  font-weight: 900;
  text-decoration: none;
}

.typing {
  display: flex;
  gap: 5px;
  padding: 17px 20px;
}

.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7b9187;
  animation: nxTyping 1s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: .15s;
}

.typing span:nth-child(3) {
  animation-delay: .3s;
}

@keyframes nxTyping {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: .45;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.ai-error {
  margin: 0 27px 12px;
  padding: 11px 14px;
  border-radius: 10px;
  background: #fff0ee;
  color: #98423a;
  font-size: 12px;
}

.ai-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin: 0 27px;
  padding: 11px;
  border: 1px solid #d9dfda;
  border-radius: 17px;
  background: #f8f9f6;
}

.ai-composer:focus-within {
  border-color: #83a493;
  box-shadow: 0 0 0 3px rgba(39,112,82,.08);
}

.ai-composer input {
  min-width: 0;
  min-height: 48px;
  padding: 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #17372c;
  font: inherit;
  font-size: 13px;
}

.ai-composer button {
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: #173f32;
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.ai-composer button:hover:not(:disabled) {
  background: #0d3327;
}

.ai-composer button:disabled {
  opacity: .55;
  cursor: wait;
}

.ai-disclaimer {
  margin: 10px 27px 18px;
  color: #999f9b;
  font-size: 9px;
  text-align: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
}

@media (max-width: 1000px) {
  .nexa-ai-hero {
    grid-template-columns: 1fr 220px;
  }

  .nexa-ai-orb {
    width: 210px;
    height: 210px;
  }

  .nexa-ai-workspace {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .ai-products {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .nexa-ai-hero {
    grid-template-columns: 1fr;
    padding-top: 50px;
  }

  .nexa-ai-orb {
    display: none;
  }

  .nexa-ai-workspace {
    grid-template-columns: 1fr;
  }

  .nexa-ai-sidebar {
    position: static;
  }

  .nexa-ai-sidebar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sidebar-label,
  .grounding-card {
    width: 100%;
  }

  .suggestion-button {
    width: auto;
    flex: 1 1 180px;
    margin: 0;
  }
}

@media (max-width: 560px) {
  .nexa-ai-page {
    padding-bottom: 35px;
  }

  .nexa-ai-hero,
  .nexa-ai-workspace {
    width: min(calc(100% - 28px), 1280px);
  }

  .nexa-ai-hero h1 {
    font-size: 50px;
  }

  .nexa-ai-intro {
    font-size: 15px;
  }

  .chat-header {
    padding: 0 18px;
  }

  .live-label {
    display: none;
  }

  .messages {
    min-height: 420px;
    padding: 22px 17px;
  }

  .message-content {
    max-width: calc(100% - 46px);
  }

  .ai-product-card {
    grid-template-columns: 90px minmax(0, 1fr);
  }

  .ai-composer {
    grid-template-columns: 1fr;
    margin: 0 16px;
  }

  .ai-composer button {
    width: 100%;
  }

  .ai-disclaimer {
    margin-inline: 18px;
  }
}
</style>
