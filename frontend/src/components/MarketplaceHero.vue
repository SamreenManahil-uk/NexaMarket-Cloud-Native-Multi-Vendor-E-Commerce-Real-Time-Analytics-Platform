<script setup lang="ts">
import CategoryArtwork from "./CategoryArtwork.vue";
</script>
<template>
  <section class="hero" aria-labelledby="hero-heading">
    <div class="hero-copy">
      <p class="hero-kicker">
        <span aria-hidden="true">✦</span> Make room for discovery
      </p>
      <h1 id="hero-heading">
        Everyday finds.<br /><span>Extra possibility.</span>
      </h1>
      <p class="hero-description">
        For your space, your routine, and your next adventure.<br
          class="desktop-break"
        />
        Find a little inspiration at NexaMarket.
      </p>
      <a href="#catalogue" class="button button-primary"
        >Explore marketplace <span aria-hidden="true">↗</span></a
      >
      <p class="hero-footnote">Your next favourite starts with a look.</p>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="hero-ring"></div>
      <span class="hero-spark">✦</span>
      <div class="hero-tile tile-notebook theme-indigo">
        <CategoryArtwork name="notebook" /><span>A fresh perspective</span>
      </div>
      <div class="hero-tile tile-mug theme-peach">
        <CategoryArtwork name="mug" /><span>Small everyday joys</span>
      </div>
      <div class="hero-tile tile-bottle theme-mint">
        <CategoryArtwork name="bottle" />
      </div>
      <div class="discovery-note">
        <span>✳</span> Good things<br />to discover.
      </div>
      <span class="hero-art-label">A world of possibility, illustrated.</span>
    </div>
  </section>
</template>
