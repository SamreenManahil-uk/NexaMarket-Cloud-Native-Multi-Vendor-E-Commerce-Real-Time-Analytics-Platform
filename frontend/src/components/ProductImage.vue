<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{
  src: string | null;
  name: string;
  category?: string;
  eager?: boolean;
}>();

const failed = ref(false);

const safeSource = computed(() => {
  if (!props.src) return null;

  try {
    const url = new URL(props.src, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
});

/*
 * Real product photography fallback.
 * Used when the API product does not yet have an image_url.
 */
const productPhoto = computed(() => {
  const text = `${props.name} ${props.category || ""}`.toLowerCase();

  // Bags / Canvas Tote
  if (
    text.includes("canvas tote") ||
    text.includes("tote bag") ||
    text.includes("bag")
  ) {
    return "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=90";
  }

  // Mug / Drinkware
  if (
    text.includes("ceramic mug") ||
    text.includes("mug") ||
    text.includes("cup")
  ) {
    return "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=90";
  }

  // Throw / Blanket / Home textile
  if (
    text.includes("cotton throw") ||
    text.includes("throw") ||
    text.includes("blanket")
  ) {
    return "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=90";
  }

  // Desk lamp
  if (
    text.includes("desk lamp") ||
    text.includes("lamp") ||
    text.includes("lighting")
  ) {
    return "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=90";
  }

  // Notebook / stationery
  if (
    text.includes("notebook") ||
    text.includes("journal") ||
    text.includes("stationery")
  ) {
    return "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1000&q=90";
  }

  // Laptop
  if (
    text.includes("laptop") ||
    text.includes("macbook") ||
    text.includes("computer")
  ) {
    return "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=90";
  }

  // Smartphone
  if (
    text.includes("phone") ||
    text.includes("mobile") ||
    text.includes("smartphone")
  ) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=90";
  }

  // Headphones
  if (
    text.includes("headphone") ||
    text.includes("headset") ||
    text.includes("earbud")
  ) {
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=90";
  }

  // Camera
  if (
    text.includes("camera") ||
    text.includes("lens")
  ) {
    return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=90";
  }

  // Watch
  if (
    text.includes("watch") ||
    text.includes("smartwatch")
  ) {
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=90";
  }

  // Keyboard / mouse / desk accessories
  if (
    text.includes("keyboard") ||
    text.includes("mouse") ||
    text.includes("desk")
  ) {
    return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=90";
  }

  // Gaming
  if (
    text.includes("gaming") ||
    text.includes("controller") ||
    text.includes("console")
  ) {
    return "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=1000&q=90";
  }

  // Generic home product
  if ((props.category || "").toLowerCase().includes("home")) {
    return "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=90";
  }

  // Generic fallback — real ecommerce product photography
  return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=90";
});

const imageSource = computed(() => {
  return safeSource.value || productPhoto.value;
});

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <div class="product-image">
    <img
      v-if="!failed"
      :src="imageSource"
      :alt="name"
      :loading="eager ? 'eager' : 'lazy'"
      @error="failed = true"
    />

    <div
      v-else
      class="image-fallback"
      role="img"
      :aria-label="`${name}: product image unavailable`"
    >
      <div class="fallback-product-icon">N</div>
      <span>Product image</span>
    </div>
  </div>
</template>
